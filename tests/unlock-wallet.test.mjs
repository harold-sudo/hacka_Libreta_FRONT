import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { Contract } from 'ethers'

const exports = {}
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/web3/unlock/prepareWallet.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText, { exports, require: createRequire(import.meta.url) })
const { prepareUnlockWallet } = exports

function walletFixture({ ignoreSwitch = false, rejectSwitch = false, unknownChain = false } = {}) {
  let chain = '0x85'
  let added = false
  const calls = []
  return {
    calls,
    setChain: (value) => { chain = value },
    request: async ({ method, params }) => {
      calls.push(method)
      if (method === 'eth_chainId') return chain
      if (method === 'wallet_switchEthereumChain') {
        if (rejectSwitch) throw { code: 4001 }
        if (unknownChain && !added) throw { code: 4902 }
        if (!ignoreSwitch) chain = params[0].chainId
        return null
      }
      if (method === 'wallet_addEthereumChain') { added = true; return null }
      if (method === 'eth_accounts') return ['0x' + '1'.repeat(40)]
      if (method === 'eth_call') {
        assert.equal(chain, '0xaa36a7', 'keyPrice must be read on Sepolia')
        return '0x' + '0'.repeat(64)
      }
      assert.fail(`Unexpected wallet request: ${method}`)
    },
  }
}

test('switches HSK to Sepolia before obtaining a signer and reading keyPrice', async () => {
  const wallet = walletFixture()
  const provider = await prepareUnlockWallet(wallet, 11155111)
  try {
    const signer = await provider.getSigner()
    const lock = new Contract('0x' + '2'.repeat(40), ['function keyPrice() view returns (uint256)'], signer)
    assert.equal(await lock.keyPrice(), 0n)
    assert.ok(wallet.calls.indexOf('wallet_switchEthereumChain') < wallet.calls.indexOf('eth_accounts'))
    assert.ok(!wallet.calls.includes('eth_sendTransaction'))
  } finally { provider.destroy() }
})

test('refuses a wallet that resolves switch without changing network', async () => {
  const wallet = walletFixture({ ignoreSwitch: true })
  await assert.rejects(prepareUnlockWallet(wallet, 11155111), /sigue en la red 133/)
  assert.ok(!wallet.calls.includes('eth_accounts'))
  assert.ok(!wallet.calls.includes('eth_call'))
})

test('reports a rejected switch without trying to read or purchase', async () => {
  const wallet = walletFixture({ rejectSwitch: true })
  await assert.rejects(prepareUnlockWallet(wallet, 11155111), /Rechazaste/)
  assert.ok(!wallet.calls.includes('eth_call'))
})

test('explicitly switches again after adding a missing network', async () => {
  const wallet = walletFixture({ unknownChain: true })
  const provider = await prepareUnlockWallet(wallet, 11155111, { chainId: '0xaa36a7' })
  try {
    assert.equal((await provider.getNetwork()).chainId, 11155111n)
    assert.equal(wallet.calls.filter((method) => method === 'wallet_switchEthereumChain').length, 2)
  } finally { provider.destroy() }
})

test('a later switch back to HSK fails instead of following that network silently', async () => {
  const wallet = walletFixture()
  const provider = await prepareUnlockWallet(wallet, 11155111)
  try {
    assert.equal((await provider.getNetwork()).chainId, 11155111n)
    wallet.setChain('0x85')
    await assert.rejects(provider.getNetwork(), /network changed/)
  } finally { provider.destroy() }
})
