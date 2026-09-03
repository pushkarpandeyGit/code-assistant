import sys
sys.path.insert(0, '.')

from main import app, TASK_METADATA, VALID_TASKS, health, AnalyzeRequest

print("=== Smoke Test ===")
print(f"VALID_TASKS: {VALID_TASKS}")
print(f"Task count: {len(TASK_METADATA)}")
for t in TASK_METADATA:
    print(f"  {t['id']:12} - {t['label']}")

print()

# Test empty code rejection
try:
    r = AnalyzeRequest(code="", language="python", task="explain")
    print("ERROR: Empty code was not rejected!")
except Exception as e:
    print(f"OK - Empty code rejected correctly")

# Test bad task rejection
try:
    r = AnalyzeRequest(code="print(1)", language="python", task="badtask")
    print("ERROR: Bad task was not rejected!")
except Exception as e:
    print(f"OK - Bad task rejected correctly")

# Test valid request
try:
    r = AnalyzeRequest(code="print(1)", language="python", task="explain")
    print(f"OK - Valid request accepted: task={r.task} lang={r.language}")
except Exception as e:
    print(f"ERROR: Valid request rejected: {e}")

# Test /health
h = health()
print(f"OK - Health check: status={h['status']} model={h['model']}")

# Test /tasks
from main import get_tasks
t = get_tasks()
print(f"OK - /tasks returns {len(t['tasks'])} tasks")

print()
print("=== All OK ===")
