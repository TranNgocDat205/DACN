"""Run with: cd ai-service && python -m pytest tests/test_engineering_intelligence.py -q"""
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.pop('AI_API_KEY', None)
import main  # noqa: E402

client = TestClient(main.app)
headers = {'X-Internal-Key': main.INTERNAL_KEY}


def test_conflict_fallback_repeated_requirement_is_explicit_duplicate(monkeypatch):
    monkeypatch.setattr(main, 'API_KEY', '')
    data = {'requirements': [
        {'id': 10, 'title': 'Đăng nhập', 'description': 'Dùng email và mật khẩu'},
        {'id': 11, 'title': 'Đăng nhập', 'description': 'Dùng email và mật khẩu'},
        {'id': 12, 'title': 'Đăng ký', 'description': 'Tạo tài khoản'},
    ]}
    result = client.post('/ai/requirements/conflicts', json=data, headers=headers)
    assert result.status_code == 200, result.text
    payload = result.json()
    assert payload['mode'] == 'rule_based_no_llm'
    assert len(payload['findings']) == 1
    assert payload['findings'][0]['kind'] == 'DUPLICATE'
    assert payload['findings'][0]['firstId'] == 10


def test_conflict_scan_rejects_duplicate_ids():
    r = client.post('/ai/requirements/conflicts', json={'requirements':[
      {'id':1,'title':'ABC'},{'id':1,'title':'BCD'}]}, headers=headers)
    assert r.status_code == 422


def test_conflict_scan_requires_internal_key():
    r=client.post('/ai/requirements/conflicts', json={'requirements':[
      {'id':1,'title':'ABC'},{'id':2,'title':'BCD'}]})
    assert r.status_code == 401


def test_semantic_conflict_filters_unknown_ids(monkeypatch):
    async def fake_chat(*_args, **_kwargs):
        return '{"findings":[{"firstId":1,"secondId":999,"kind":"CONTRADICTION"},' \
               '{"firstId":1,"secondId":2,"kind":"CONTRADICTION","severity":"HIGH",' \
               '"explanation":"Ràng buộc khác nhau"}]}'
    monkeypatch.setattr(main,'API_KEY','unit-test-nonsecret')
    monkeypatch.setattr(main,'call_chat',fake_chat)
    r = client.post('/ai/requirements/conflicts', json={'requirements':[
      {'id':1,'title':'A'},{'id':2,'title':'B'}]},headers=headers)
    assert r.status_code == 200
    assert len(r.json()['findings']) == 1
    assert r.json()['findings'][0]['secondId'] == 2


def test_impact_only_returns_grounded_summary_without_llm(monkeypatch):
    monkeypatch.setattr(main,'API_KEY','')
    r = client.post('/ai/requirements/impact', json={
      'before':{'title':'Login','description':'Password'},
      'after':{'title':'Login OTP','description':'Password + OTP'},
      'linkedStories':[{'id':3,'title':'Login story'}],
      'linkedTasks':[{'id':4,'title':'Build login'}]
    },headers=headers)
    assert r.status_code == 200
    assert r.json()['mode']=='rule_based_no_llm'
    assert r.json()['possibleImpacts']==[]
    assert r.json()['changeType']=='CHANGED'
