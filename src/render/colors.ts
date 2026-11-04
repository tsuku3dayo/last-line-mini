// 独自の配色（LLM-GUI-0001 §2）
export const COLORS = {
  sky: '#05070f',
  groundFill: '#2b3b2f',
  groundEdge: '#4f6b55',
  cityLight: '#ffb347',
  cityBuilding: '#6b4a2a',
  /** 壊れた都市のがれき（LLM-GUI-0001 §4） */
  cityRubble: '#3a2a1a',
  base: '#8fd3ff',
  /** 壊れた基地の台（LLM-GUI-0001 §4） */
  baseBroken: '#555555',
  interceptor: '#6cff8a',
  enemyTrail: '#ff5a3c',
  enemyHead: '#ffffff',
  blast: ['#ffe066', '#ff9f1c', '#ff5a3c'],
  cursor: '#ffffff',
  hud1p: '#e0e0e0',
  hudTop: '#ffb347',
  ammo: '#8fd3ff',
  ammoEmpty: '#555555',
} as const;
