"""
Manual test script for self-healing system
"""

from app.startup_builder.v4.healing import SelfHealer, Failure

def test_port_error():
    """Test healing of port in use error"""
    print("\n" + "="*60)
    print("TEST 1: Port In Use Error")
    print("="*60)
    
    healer = SelfHealer()
    
    failure = Failure(
        error_message="Error: listen EADDRINUSE: address already in use :::8083",
        error_type="PortInUse",
        file="server.js",
        line=10,
        tool_name="run_shell",
        command="npm start"
    )
    
    result = healer.heal(failure, {"task": {"description": "Start Expo server"}})
    
    print(f"\n✓ Success: {result.success}")
    print(f"✓ Root Cause: {result.diagnosis.root_cause}")
    print(f"✓ Confidence: {result.diagnosis.confidence:.0%}")
    print(f"✓ Strategy: {result.strategy_used.description if result.strategy_used else 'None'}")
    print(f"\n{result.message}")
    
    return result.success


def test_module_error():
    """Test healing of module not found error"""
    print("\n" + "="*60)
    print("TEST 2: Module Not Found Error")
    print("="*60)
    
    healer = SelfHealer()
    
    failure = Failure(
        error_message="ModuleNotFoundError: No module named 'requests'",
        error_type="ModuleNotFoundError",
        file="api.py",
        line=1,
        tool_name="run_shell",
        command="python api.py"
    )
    
    result = healer.heal(failure, {})
    
    print(f"\n✓ Success: {result.success}")
    print(f"✓ Root Cause: {result.diagnosis.root_cause}")
    print(f"✓ Confidence: {result.diagnosis.confidence:.0%}")
    print(f"\n{result.message}")
    
    return result.success


def test_syntax_error():
    """Test healing of syntax error"""
    print("\n" + "="*60)
    print("TEST 3: Syntax Error")
    print("="*60)
    
    healer = SelfHealer()
    
    failure = Failure(
        error_message="SyntaxError: invalid syntax",
        error_type="SyntaxError",
        file="app.py",
        line=15,
        code="def hello(name: str)\n    return name",
        tool_name="run_shell",
        command="python app.py"
    )
    
    result = healer.heal(failure, {})
    
    print(f"\n✓ Success: {result.success}")
    print(f"✓ Root Cause: {result.diagnosis.root_cause}")
    print(f"✓ Confidence: {result.diagnosis.confidence:.0%}")
    print(f"\n{result.message}")
    
    return result.success


def test_unknown_error():
    """Test healing of unknown error"""
    print("\n" + "="*60)
    print("TEST 4: Unknown Error (Heuristic Analysis)")
    print("="*60)
    
    healer = SelfHealer()
    
    failure = Failure(
        error_message="Something went terribly wrong",
        error_type="UnknownError",
        tool_name="run_shell",
        command="npm test"
    )
    
    result = healer.heal(failure, {})
    
    print(f"\n✓ Success: {result.success}")
    print(f"✓ Root Cause: {result.diagnosis.root_cause}")
    print(f"✓ Confidence: {result.diagnosis.confidence:.0%}")
    print(f"✓ Category: {result.diagnosis.error_category.value}")
    print(f"\n{result.message}")
    
    return result.success


if __name__ == "__main__":
    print("\n" + "="*60)
    print("V4 SELF-HEALING SYSTEM - MANUAL TESTS")
    print("="*60)
    
    results = []
    
    results.append(("Port Error", test_port_error()))
    results.append(("Module Error", test_module_error()))
    results.append(("Syntax Error", test_syntax_error()))
    results.append(("Unknown Error", test_unknown_error()))
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
