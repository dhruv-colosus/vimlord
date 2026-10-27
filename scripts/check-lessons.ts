// Plays every challenge's reference solution through the engine and checks
// that it solves the challenge exactly on its last key.
import { lessons } from '../src/lib/lessons'
import { initRun, stepRun } from '../src/lib/challenge'
import { parseKeys } from '../src/lib/vim/engine'

let failures = 0
for (const lesson of lessons) {
  lesson.challenges.forEach((ch, i) => {
    let rs = initRun(ch)
    const keys = parseKeys(ch.solution)
    let solvedAt = -1
    for (const [k, key] of keys.entries()) {
      rs = stepRun(rs, ch, key)
      if (rs.blocked) break
      if (rs.solved) {
        solvedAt = k
        break
      }
    }
    const ok = solvedAt === keys.length - 1
    if (!ok) {
      failures++
      console.log(`✗ ${lesson.id} #${i + 1} "${ch.title}"`)
      console.log(`   blocked=${rs.blocked} solvedAt=${solvedAt}/${keys.length - 1} mode=${rs.vim.mode}`)
      console.log(`   text=${JSON.stringify(rs.vim.text)} cursor=${rs.vim.cursor} collected=${rs.collected.length}/${rs.targets.length}`)
    }
  })
}
console.log(failures ? `${failures} failing` : 'All challenge solutions pass')
process.exit(failures ? 1 : 0)
