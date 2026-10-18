async def go(q):
  await q.screenshot(path=str(OUT/'v_a.png'))
  t=await q.inner_text('body'); print(t[:2500])
  for b in await q.get_by_role('button').all_inner_texts(): pass
