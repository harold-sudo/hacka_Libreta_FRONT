import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(relativePath, dependencies, globals = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, require: (id) => dependencies[id] ?? require(id), ...globals,
  })
  return exports
}

function providerFixture() {
  const window = new EventTarget()
  const provider = load('../src/lib/web3/provider.ts', {
    './chains': { toAddChainParameter: () => ({}) },
    './config': { hskChain: { chainIdHex: '0x85' } },
  }, { window, Event, CustomEvent })
  return { window, provider }
}

test('selects announced MetaMask instead of another injected wallet and keeps it stable', () => {
  const { window, provider } = providerFixture()
  window.ethereum = { request() { throw new Error('wrong wallet') } }
  const metamask = { request: async () => ['0x123'] }
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: { info: { rdns: 'io.metamask' }, provider: metamask },
  }))
  assert.equal(provider.selectEthereumProvider(), metamask)
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: { info: { rdns: 'io.metamask' }, provider: { request() {} } },
  }))
  assert.equal(provider.getEthereumProvider(), metamask)
})

test('supports legacy MetaMask and does not select an unrelated extension', () => {
  const { window, provider } = providerFixture()
  window.ethereum = { request() {} }
  assert.equal(provider.getEthereumProvider(), null)
  const metamask = { isMetaMask: true, request() {} }
  window.ethereum.providers = [window.ethereum, metamask]
  assert.equal(provider.getEthereumProvider(), metamask)
})

function storeFixture(overrides = {}) {
  const provider = { on() {} }
  return load('../src/features/wallet/walletStore.ts', {
    '../../lib/web3/provider': {
      getEthereumProvider: () => provider,
      selectEthereumProvider: () => provider,
      requestAccount: async () => '0x123',
      switchToHskChain: async () => {},
      getCurrentChainId: async () => 133,
      getBalanceHsk: async () => 0n,
      ...overrides,
    },
  }).useWalletStore
}

test('an unavailable balance RPC does not block an authorized wallet connection', async () => {
  const store = storeFixture({ getBalanceHsk: () => new Promise(() => {}) })
  await store.getState().connect()
  assert.equal(store.getState().isConnected, true)
  assert.equal(store.getState().isConnecting, false)
  assert.equal(store.getState().balanceHsk, null)
})

for (const [code, message] of [[4001, /Rechazaste/], [-32002, /pendiente/]]) {
  test(`shows actionable feedback for MetaMask error ${code}`, async () => {
    const store = storeFixture({ requestAccount: async () => { throw { code } } })
    await store.getState().connect()
    assert.equal(store.getState().isConnected, false)
    assert.equal(store.getState().isConnecting, false)
    assert.match(store.getState().error, message)
  })
}
