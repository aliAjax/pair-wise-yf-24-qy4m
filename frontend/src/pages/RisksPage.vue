<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useReviewSessionStore } from "../stores/ReviewSessionStore";
import { useAuditLogStore } from "../stores/AuditLogStore";
import type { PolicySection } from "../types/PolicySection";
import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import type { SectionCategory } from "../constants/SectionCategory";
import {
  PrivacyRiskLevelOptions,
  PrivacyRiskLevelText
} from "../constants/PrivacyRiskLevel";
import { SectionCategoryOptions, SectionCategoryText, HighRiskCategories } from "../constants/SectionCategory";
import StatCard from "../components/common/StatCard.vue";
import RiskTag from "../components/common/RiskTag.vue";
import EmptyState from "../components/common/EmptyState.vue";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const sessionStore = useReviewSessionStore();
const auditStore = useAuditLogStore();
const { rows: sections, riskStats } = storeToRefs(sectionStore);

const scopeId = ref<number | null>(sessionStore.new_document_id);
const categoryFilter = ref<SectionCategory | "ALL">("ALL");
const levelFilter = ref<PrivacyRiskLevel | "ALL">("ALL");
const highRiskOnly = ref(false);
const keyword = ref("");
const editingSection = ref<PolicySection | null>(null);
const editLevel = ref<PrivacyRiskLevel>("HIGH");
const editCategory = ref<SectionCategory>("GENERAL");
const editReason = ref("");
const saving = ref(false);

const scopeDocument = computed(() => documentStore.byId(scopeId.value));

const scopedSections = computed(() =>
  scopeId.value === null ? [] : sectionStore.byDocument(scopeId.value)
);

const filtered = computed(() =>
  scopedSections.value.filter((section) => {
    if (categoryFilter.value !== "ALL" && section.category !== categoryFilter.value) return false;
    if (levelFilter.value !== "ALL" && section.risk_level !== levelFilter.value) return false;
    if (highRiskOnly.value && !HighRiskCategories.includes(section.category) &&
        section.risk_level !== "HIGH" && section.risk_level !== "CRITICAL") {
      return false;
    }
    if (keyword.value.trim()) {
      const key = keyword.value.trim();
      if (!`${section.section_no}${section.heading}${section.content}${section.risk_reason}`.includes(key)) {
        return false;
      }
    }
    return true;
  })
);

const highRiskCount = computed(
  () => scopedSections.value.filter((s) => s.risk_level === "HIGH" || s.risk_level === "CRITICAL").length
);
const highCategoryCount = computed(
  () => scopedSections.value.filter((s) => HighRiskCategories.includes(s.category)).length
);

function startEdit(section: PolicySection): void {
  editingSection.value = section;
  editLevel.value = section.risk_level;
  editCategory.value = section.category;
  editReason.value = section.risk_reason;
}

async function saveEdit(): Promise<void> {
  if (!editingSection.value) return;
  saving.value = true;
  const ok = await sectionStore.annotate(
    editingSection.value,
    {
      risk_level: editLevel.value,
      category: editCategory.value,
      risk_reason: editReason.value || `人工设定为${PrivacyRiskLevelText[editLevel.value]}风险`
    },
    "风险标注页"
  );
  saving.value = false;
  auditStore.refresh();
  if (ok) {
    ElMessage.success("风险标注已更新并写入处理记录");
    editingSection.value = null;
  } else {
    ElMessage.error(sectionStore.error);
  }
}

onMounted(async () => {
  sessionStore.load();
  scopeId.value = sessionStore.new_document_id;
  await Promise.all([documentStore.load(), sectionStore.load()]);
});
</script>

<template>
  <div class="stack">
    <section class="panel">
      <div class="panel-title">
        标注版本
        <span class="sub">风险清单与待办默认跟随对比页选定的“所审新版版本”</span>
        <div style="flex:1" />
        <el-select v-model="scopeId" placeholder="选择要标注的版本" style="width: 320px">
          <el-option
            v-for="option in documentStore.versionOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </section>

    <section class="metric-grid">
      <StatCard label="条款总数" :value="scopedSections.length" />
      <StatCard label="高风险类别条款（收集/共享/期限）" :value="highCategoryCount" tone="warning" />
      <StatCard label="高/严重风险条款" :value="highRiskCount" tone="danger" />
      <StatCard label="严重" :value="riskStats.CRITICAL" tone="danger" />
      <StatCard label="高" :value="riskStats.HIGH" tone="warning" />
      <StatCard label="中" :value="riskStats.MEDIUM" />
      <StatCard label="低" :value="riskStats.LOW" tone="success" />
    </section>

    <section class="panel">
      <div class="filter-bar">
        <el-select v-model="categoryFilter" size="small" style="width: 170px">
          <el-option label="全部类别" value="ALL" />
          <el-option
            v-for="option in SectionCategoryOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select v-model="levelFilter" size="small" style="width: 140px">
          <el-option label="全部风险等级" value="ALL" />
          <el-option
            v-for="option in PrivacyRiskLevelOptions"
            :key="option.value"
            :label="`${option.label}风险`"
            :value="option.value"
          />
        </el-select>
        <el-input
          v-model="keyword"
          size="small"
          placeholder="搜索编号/标题/正文/判定理由"
          clearable
          style="width: 240px"
        />
        <div style="flex:1" />
        <el-checkbox v-model="highRiskOnly">只看高风险条款</el-checkbox>
      </div>

      <el-table :data="filtered" stripe v-if="scopeId !== null">
        <el-table-column label="编号" width="80" prop="section_no" />
        <el-table-column label="条款标题" min-width="180" prop="heading" />
        <el-table-column label="类别" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="HighRiskCategories.includes(row.category) ? 'warning' : 'info'" effect="plain">
              {{ SectionCategoryText[row.category as SectionCategory] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="110">
          <template #default="{ row }">
            <RiskTag :level="row.risk_level as PrivacyRiskLevel" :reason="row.risk_reason" />
          </template>
        </el-table-column>
        <el-table-column label="内容摘要" min-width="280">
          <template #default="{ row }">
            <span class="text-muted">{{ row.content.slice(0, 80) }}{{ row.content.length > 80 ? "…" : "" }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="startEdit(row as PolicySection)">
              调整标注
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState title="没有符合条件的条款" description="调整筛选条件，或先在文档导入页选择所审新版版本。" icon="⚠️" />
        </template>
      </el-table>

      <EmptyState
        v-else
        title="尚未选择标注版本"
        description="在右上角选择一个政策版本；建议直接使用对比页中选定的所审新版版本。"
        icon="🏷️"
      />
    </section>

    <el-drawer v-model="editingSection" title="调整风险标注" size="440px" :destroy-on-close="true">
      <div v-if="editingSection" class="stack">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="条款">
            {{ editingSection.section_no }} {{ editingSection.heading }}
          </el-descriptions-item>
          <el-descriptions-item label="当前自动判定">
            <RiskTag :level="editingSection.risk_level" :reason="editingSection.risk_reason" />
            <span class="text-muted" style="margin-left: 8px">
              {{ SectionCategoryText[editingSection.category] }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
        <el-form label-position="top">
          <el-form-item label="风险等级（数据收集/共享/保存期限重点关注）">
            <el-radio-group v-model="editLevel">
              <el-radio-button
                v-for="option in PrivacyRiskLevelOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="条款类别">
            <el-select v-model="editCategory" style="width: 100%">
              <el-option
                v-for="option in SectionCategoryOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="处理依据 / 备注（写入留档）">
            <el-input v-model="editReason" type="textarea" :rows="3" maxlength="200" show-word-limit />
          </el-form-item>
        </el-form>
        <div class="text-muted">
          保存后会在操作留档中记录“风险等级变更”，并同步更新对比页与审阅清单的风险展示。
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <el-button @click="editingSection = null">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveEdit">保存标注</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>
