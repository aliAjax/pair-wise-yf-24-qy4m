import { parsePolicyText } from "../src/hooks/usePolicyParser";
import { detectRisk } from "../src/constants/riskRules";
import { hashContent } from "../src/utils/hash";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("❌ ASSERT FAILED:", message);
    process.exitCode = 1;
  } else {
    console.log("✅", message);
  }
}

// 1. 解析：编号识别（多级编号、第N条、附件）
const sample = `1. 引言
前言内容。
2. 收集
收集内容。
2.1 设备信息
设备号。
3. 共享
共享内容。`;
const parsed = parsePolicyText(sample);
assert(parsed.length === 4, `解析出 4 个条款（实际 ${parsed.length}）`);
assert(parsed[0].section_no === "1" && parsed[0].heading === "引言", "识别 1. 引言");
assert(parsed[2].section_no === "2.1" && parsed[2].order_path.join(".") === "2.1", "识别多级编号 2.1");
assert(parsed[0].content.includes("前言内容"), "条款正文归属正确");

const cnParsed = parsePolicyText("第3条 保存期限\n我们保留三十日。");
assert(cnParsed[0].section_no === "3" && cnParsed[0].heading === "保存期限", "识别「第3条」中文编号");

// 2. 风险自动标注：数据收集/共享/保存期限 + 敏感升级
const collection = detectRisk("我们如何收集", "我们收集您的位置信息和设备信息");
assert(collection.category === "DATA_COLLECTION" && collection.risk_level === "HIGH", "数据收集条款标 HIGH");
const sharing = detectRisk("共享规则", "向第三方和合作伙伴提供，接入 SDK");
assert(sharing.category === "DATA_SHARING" && sharing.risk_level === "HIGH", "第三方共享条款标 HIGH");
const retention = detectRisk("保存期限", "注销后三十日内删除，最短期限保留");
assert(retention.category === "RETENTION" && retention.risk_level === "HIGH", "保存期限条款标 HIGH");
const critical = detectRisk("收集", "收集您的面部信息等敏感个人信息用于身份核验");
assert(critical.risk_level === "CRITICAL", "敏感个人信息升级为 CRITICAL");
const minor = detectRisk("未成年人", "不满十四周岁未成年人使用服务");
assert(minor.risk_level === "CRITICAL", "未成年人条款升级为 CRITICAL");
const general = detectRisk("引言", "本政策适用于全部产品");
assert(general.risk_level === "LOW", "普通条款为 LOW");

// 3. hash 变化判断
const h1 = hashContent("注销后三十日内删除");
const h2 = hashContent("注销后六十日内删除");
assert(h1 !== h2, "内容不同则指纹不同（保存期限 30 日 → 60 日可触发回退）");
assert(hashContent("三十日") === hashContent("三十日"), "内容相同则指纹稳定");

// 4. 种子两版政策的差异类型覆盖
import { seedDocuments } from "../src/mocks/seedData";
const oldSections = parsePolicyText(seedDocuments[0].raw_text);
const newSections = parsePolicyText(seedDocuments[1].raw_text);
assert(oldSections.length === 9, `旧版 9 条（实际 ${oldSections.length}）`);
assert(newSections.length === 11, `新版 11 条（实际 ${newSections.length}）`);
const oldHeadings = new Set(oldSections.map((s) => s.heading));
const newHeadings = new Set(newSections.map((s) => s.heading));
const added = newSections.filter((s) => !oldHeadings.has(s.heading)).map((s) => s.heading);
const removed = oldSections.filter((s) => !newHeadings.has(s.heading)).map((s) => s.heading);
assert(added.includes("我们如何委托处理和对外提供您的个人信息"), "种子包含新增：委托处理");
assert(added.includes("自动化决策与个性化推荐"), "种子包含新增：自动化决策");
assert(removed.includes("Cookie 和同类技术"), "种子包含移除：Cookie");
const minorOld = oldSections.find((s) => s.heading.includes("未成年人"));
const minorNew = newSections.find((s) => s.heading.includes("未成年人"));
assert(minorOld && minorNew && minorOld.content_hash === minorNew.content_hash, "未成年人条款内容不变（换序候选）");
assert(minorOld?.section_no === "8" && minorNew?.section_no === "6", "未成年人条款 8 → 6（换序）");

console.log("\n逻辑测试完成");
