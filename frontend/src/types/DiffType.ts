/**
 * 枚举类型聚合位置之一（类型侧）。
 * 值与文案的权威定义在 constants/DiffType.ts，其它模块统一从 constants 取值，
 * 实体模型从这里取类型，形成“枚举多模块重复定义”的耦合面。
 */
export type { DiffType, DiffTypeText as DiffTypeTextMap } from "../constants/DiffType";
