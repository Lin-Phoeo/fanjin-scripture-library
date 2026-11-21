"""Offline checks of exact function ASTs from the pinned published wheel.
No package import, daemon, native CLI, network, model, account or credential use.
These are pure-function checks, NOT a real adapter integration test.
"""
import ast, datetime, hashlib, json, os
from pathlib import Path
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parent
PKG = ROOT / "hmb-0.69.7" / "hey_my_buddy"
ns = {"json": json, "os": os, "Path": Path, "datetime": datetime.datetime, "timezone": datetime.timezone}
sources = []
def exact_nodes(relative, names):
    source = PKG / relative
    tree = ast.parse(source.read_text(encoding="utf-8"))
    selected = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name in names]
    assert {n.name for n in selected} == set(names)
    module = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0), *selected], type_ignores=[])
    ast.fix_missing_locations(module)
    exec(compile(module, str(source), "exec"), ns)
    sources.append({"path":relative, "sha256":hashlib.sha256(source.read_bytes()).hexdigest(), "symbols":names})
exact_nodes("timestamps.py", ["utc_now"])
exact_nodes("buddy/harnesses/dsh/protocol.py", ["NativeError"])
exact_nodes("buddy/harnesses/dsh/native_run.py", ["_declared_model_value", "_declared_effort_value", "_readback", "_catalog", "_catalog_receipt", "_micro_task_binding", "_valid_micro_task_binding"])
exact_nodes("buddy/harnesses/discovery.py", ["native_environment", "shim_environment"])
VALUE_A = '["provider-a","same-model"]'
VALUE_B = '["provider-b","same-model"]'
OPTIONS = [
    {"id":"model", "options":[{"name":"providers", "options":[{"name":"A","value":VALUE_A},{"name":"B","value":VALUE_B},{"value":"not-json"},{"value":VALUE_A}]}]},
    {"id":"reasoning_effort", "options":[{"value":"low"},{"value":"high"}]}
]
class PublishedPureLogic(unittest.TestCase):
    def test_catalog_preserves_two_provider_identities(self):
        catalog = ns["_catalog"](OPTIONS, "fixture-only")
        self.assertEqual([p["provider"] for p in catalog["providers"]], ["provider-a","provider-b"])
        self.assertEqual([len(p["models"]) for p in catalog["providers"]], [1,1])
        self.assertEqual(catalog["providers"][0]["models"][0]["efforts"], ["low","high"])
        self.assertIsNone(catalog["providers"][0]["models"][0]["contextWindow"])
    def test_selector_matches_provider_and_model(self):
        for provider, expected in [("provider-a",VALUE_A),("provider-b",VALUE_B)]:
            self.assertEqual(ns["_declared_model_value"](OPTIONS,SimpleNamespace(provider=provider,model="same-model")),expected)
    def test_unknown_provider_refused(self):
        with self.assertRaises(ns["NativeError"]) as error:
            ns["_declared_model_value"](OPTIONS,SimpleNamespace(provider="absent",model="same-model"))
        self.assertEqual(error.exception.code,"buddy-unavailable")
    def test_effort_must_be_declared(self):
        self.assertEqual(ns["_declared_effort_value"](OPTIONS,SimpleNamespace(effort="high")),"high")
        with self.assertRaises(ns["NativeError"]):
            ns["_declared_effort_value"](OPTIONS,SimpleNamespace(effort="ultra"))
    def test_unread_readback_stays_unknown(self):
        self.assertIsNone(ns["_readback"]({"currentValue":"pretend"},"model"))
        self.assertIsNone(ns["_readback"]([{"id":"model","currentValue":None}],"model"))
        self.assertEqual(ns["_readback"]([{"id":"model","currentValue":VALUE_B}],"model"),VALUE_B)
    def test_session_binding_rejects_provider_and_task_change(self):
        req = SimpleNamespace(identity=SimpleNamespace(task_id="task-a"),cwd="fixture-cwd",buddy=SimpleNamespace(provider="provider-a",model="same-model",effort="high"))
        binding = ns["_micro_task_binding"](req,"session-a")
        self.assertTrue(ns["_valid_micro_task_binding"](req,"session-a",binding))
        req.buddy.provider = "provider-b"
        self.assertFalse(ns["_valid_micro_task_binding"](req,"session-a",binding))
        req.buddy.provider = "provider-a"
        req.identity.task_id = "task-b"
        self.assertFalse(ns["_valid_micro_task_binding"](req,"session-a",binding))
    def test_environment_filters_shell_credentials_and_endpoint(self):
        synthetic = {"HOME":"fixture-home","DSH_HOME":"fixture-dsh","PATH":"fixture-bin","HTTPS_PROXY":"fixture-proxy","NODE_EXTRA_CA_CERTS":"fixture-ca","OPENAI_API_KEY":"[REDACTED_LITERAL]","ANTHROPIC_API_KEY":"[REDACTED_LITERAL]","ANTHROPIC_BASE_URL":"fake","OPENAI_BASE_URL":"fake","HMB_AGENT_CREDENTIAL_FILE":"fake"}
        result = ns["native_environment"](synthetic)
        self.assertEqual(set(result),{"HOME","DSH_HOME","PATH","HTTPS_PROXY","NODE_EXTRA_CA_CERTS"})
        self.assertEqual(result["DSH_HOME"],"fixture-dsh")
if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PublishedPureLogic))
    output = {"scope":"Exact AST pure functions from published 0.69.7; no adapter transport/runtime/native test", "tests":result.testsRun, "failures":len(result.failures), "errors":len(result.errors), "sources":sources, "nativeOrModelInvocations":0}
    (ROOT/"hmb-offline-results.json").write_text(json.dumps(output,indent=2),encoding="utf-8")
    raise SystemExit(0 if result.wasSuccessful() else 1)
