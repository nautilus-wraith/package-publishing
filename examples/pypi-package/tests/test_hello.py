from hello_world import hello


def test_hello_default():
    assert hello() == "Hello, World!"


def test_hello_named():
    assert hello("PyPI") == "Hello, PyPI!"
