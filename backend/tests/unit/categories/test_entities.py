from uuid import uuid4
from app.modules.categories.domain.entities import Category


def test_category_defaults():
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316")
    assert cat.name == "Еда"
    assert cat.type == "expense"
    assert cat.user_id is None
    assert cat.parent_id is None
    assert cat.is_system is False
    assert cat.deleted_at is None
    assert cat.id is not None


def test_category_ids_unique():
    c1 = Category(name="A", type="expense", icon="x", color="#fff")
    c2 = Category(name="B", type="expense", icon="x", color="#fff")
    assert c1.id != c2.id


def test_subcategory_has_parent():
    parent_id = uuid4()
    child = Category(name="Рестораны", type="expense", icon="fork", color="#f97316", parent_id=parent_id)
    assert child.parent_id == parent_id
