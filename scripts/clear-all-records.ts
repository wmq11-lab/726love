/**
 * 清空所有恋爱记忆相关数据（一次性脚本）
 * 用法: pnpm exec tsx scripts/clear-all-records.ts
 */
import 'dotenv/config';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

async function clearTable(table: string, label: string) {
  const client = getSupabaseClient();
  const { error, count } = await client.from(table).delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`${label} 删除失败: ${error.message}`);
  console.log(`✓ ${label}: 已删除 ${count ?? 0} 条`);
}

async function main() {
  console.log('开始清空记忆数据...\n');

  await clearTable('wechat_chats', '微信聊天');
  await clearTable('record_images', '记录图片');
  await clearTable('love_records', '恋爱记录');
  await clearTable('locations', '地点');

  console.log('\n全部记忆数据已清空。');
}

main().catch((err) => {
  console.error('清空失败:', err.message);
  process.exit(1);
});
