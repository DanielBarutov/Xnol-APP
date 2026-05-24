from app.modules.auth.domain.entities import User


def test_user_defaults():
    user = User(email="a@a.com", full_name="Alice", primary_currency="RUB")
    assert user.email == "a@a.com"
    assert user.is_active is True
    assert user.password_hash is None
    assert user.id is not None
    assert user.created_at is not None


def test_user_ids_are_unique():
    u1 = User(email="a@a.com", full_name="A", primary_currency="RUB")
    u2 = User(email="b@b.com", full_name="B", primary_currency="RUB")
    assert u1.id != u2.id
