"""Acceptance checks for the v65 daily plan, achievements, and weekly parent report."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


sys.stdout.reconfigure(encoding="utf-8")
BASE = os.environ.get("SMOKE_URL", "http://127.0.0.1:4173/index.html")
TEST_URL = BASE + ("&" if "?" in BASE else "?") + "test=1"
CHROME = Path(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe"))
STATE = """
const now=Date.now(),day=new Date().toISOString().slice(0,10);
localStorage.setItem('grade1_island_reset_v1','1');
localStorage.setItem('grade1_island_state_v1', JSON.stringify({
 schema:'grade1-game-v1',pts:45,strk:7,dog:{type:'trex',xp:72,hu:72,hy:64,en:86,tasks:6},
 _setup:{done:true,name:'乐乐',grade:'一年级'},_parentAuth:false,parentPin:'1234',parentQA:{q:'',a:''},
 vR:{},poems:{},chars:{},dailyGoal:{tasks:2,chars:3},mathC:0,mathT:0,
 scr:{on:true,contMin:20,restMin:5,dayMin:30,extMin:0,used:0,cont:0,day:''},
 game:{
  levels:{
   'start-1':{stars:3,tasks:[true,true,true],wrong:0,attempts:3,completedAt:now-86400000},
   'zh-tone-1':{stars:3,tasks:[true,true,true],wrong:1,attempts:3,completedAt:now}
  },reviewQueue:{},rewardLedger:{},petResponseHistory:[],activeLevel:'zh-initial-1',
  activityLog:[
   {at:now-86400000,day:new Date(now-86400000).toISOString().slice(0,10),kind:'complete',levelId:'start-1',region:'start',title:'伙伴启程'},
   {at:now,day:day,kind:'star',levelId:'zh-tone-1',region:'chinese',title:'拼音四声'},
   {at:now,day:day,kind:'review-correct',levelId:'zh-tone-1',region:'chinese',title:'拼音四声'}
  ]
 }
}));
HTMLMediaElement.prototype.play=function(){setTimeout(()=>this.onended&&this.onended(),0);return Promise.resolve()};
HTMLMediaElement.prototype.pause=function(){};
"""


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(CHROME) if CHROME.exists() else None, args=["--no-proxy-server"])
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    context.add_init_script(STATE)
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(TEST_URL, wait_until="networkidle", timeout=30_000)
    page.wait_for_function("window.__G1_TEST && document.documentElement.dataset.appVersion === 'v69-fast-loading'")

    daily = page.locator(".l66-plan")
    assert daily.count() == 1
    assert "今日全科成长计划" in daily.inner_text()
    assert daily.locator(".l66-subjects > span").count() == 5
    assert "0 / 5" in daily.locator("header").inner_text()

    page.evaluate("g1ShowAchievements()")
    assert page.locator("#g1BadgeModal .g1-badge-grid > div").count() == 8
    assert page.locator("#g1BadgeModal .g1-badge-grid > div.open").count() >= 2
    page.locator("#g1BadgeModal header button").click()

    page.evaluate("S._parentAuth=true;showPage('parent')")
    report = page.locator("#g1WeekReport")
    assert report.count() == 1
    assert "一周成长报告" in report.inner_text()
    assert report.locator(".g1-week-chart > div").count() == 7
    assert report.locator(".g1-week-kpis > div").count() == 4
    assert "下一步建议" in report.inner_text()
    assert page.locator("#g1ParentReport .g1-parent-actions button").count() == 2

    report.locator("header button").click()
    assert page.locator("#g1PrintSheet").count() == 1
    assert "乐乐的一年级成长报告" in page.locator("#g1PrintSheet").inner_text()
    page.locator("#g1PrintSheet .g1-print-actions button").first.click()

    for width, height in ((320, 568), (375, 667), (390, 844), (768, 1024), (1024, 768), (1366, 768)):
        page.set_viewport_size({"width": width, "height": height})
        page.evaluate("S._parentAuth=false;showPage('home')")
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth + 1"), width
        assert page.locator(".l66-plan .l66-primary").evaluate("e=>e.getBoundingClientRect().height") >= 48

    assert not errors, errors
    print("v65 family value acceptance: PASS (daily plan, achievements, weekly report, print, responsive)")
    context.close()
    browser.close()
