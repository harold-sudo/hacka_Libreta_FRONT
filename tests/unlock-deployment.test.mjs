import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/web3/unlock/validateDeployment.ts', import.meta.url), 'utf8')
const exports = {}
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText, { exports })
const { validateUnlockDeployment } = exports
const address = '0x' + '1'.repeat(40)

test('rejects an RPC pointing to a different chain before looking up the address', async () => {
  await assert.rejects(validateUnlockDeployment({
    getNetwork: async () => ({ chainId: 8453n }),
    getCode: async () => { assert.fail('must not query the wrong chain') },
  }, address, 133), /red 8453.*133/)
})

test('explains empty bytecode instead of interpreting it as a missing membership', async () => {
  await assert.rejects(validateUnlockDeployment({
    getNetwork: async () => ({ chainId: 133n }),
    getCode: async (target) => { assert.equal(target, address); return '0x' },
  }, address, 133), /No existe un contrato/)
})

test('allows contract reads on the configured network when code exists', async () => {
  await validateUnlockDeployment({
    getNetwork: async () => ({ chainId: 133n }),
    getCode: async () => '0x6000',
  }, address, 133)
})

test('propagates RPC failures rather than reporting no contract or no membership', async () => {
  const failure = new Error('RPC unavailable')
  await assert.rejects(validateUnlockDeployment({
    getNetwork: async () => ({ chainId: 133n }),
    getCode: async () => { throw failure },
  }, address, 133), (error) => error === failure)
})
