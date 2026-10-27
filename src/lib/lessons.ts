import type { Mode } from './vim/engine'
import type { IconName } from '../components/icons'

// Prompts use `{key}` to render a key chip and `**text**` for emphasis.
// Start buffers use `▮` before the character the cursor starts on and `◆`
// before each character the player has to reach.

export type Tint = 'blue' | 'green' | 'purple' | 'teal' | 'pink' | 'amber'

export interface Challenge {
  title: string
  prompt: string
  start: string
  startMode?: Mode
  goal: 'text' | 'reach' | 'mode'
  target?: string
  mode?: Mode
  solution: string
  allowed?: string[]
  mustUse?: string[]
  walls?: string
  hint?: string
}

export interface KeyDoc {
  keys: string
  desc: string
}

export interface Lesson {
  id: string
  title: string
  tagline: string
  chapter: number
  icon: IconName
  briefing: { title: string; body: string }[]
  keys: KeyDoc[]
  challenges: Challenge[]
}

export interface Chapter {
  id: number
  title: string
  blurb: string
  tint: Tint
}

export const chapters: Chapter[] = [
  { id: 1, title: 'First steps', blurb: 'Modes, movement and getting text in.', tint: 'blue' },
  { id: 2, title: 'Getting around', blurb: 'Words, lines, finds and search.', tint: 'teal' },
  { id: 3, title: 'Making changes', blurb: 'Delete, undo, operators and the clipboard.', tint: 'green' },
  { id: 4, title: 'Power moves', blurb: 'Text objects and visual selections.', tint: 'purple' },
]

const HJKL = ['h', 'j', 'k', 'l']

export const lessons: Lesson[] = [
  {
    id: 'intro-to-modes',
    title: 'Intro to modes',
    tagline: 'The one idea that makes Vim click',
    chapter: 1,
    icon: 'toggle',
    briefing: [
      {
        title: 'Vim is modal',
        body: 'In most editors every key types a letter. In Vim the same key does different things depending on the **mode** you are in.',
      },
      {
        title: 'Normal mode is home',
        body: 'You start in **Normal** mode, where keys are commands: move, delete, copy. Press {i} to switch to **Insert** mode and type like any other editor.',
      },
      {
        title: 'Escape gets you back',
        body: 'Press {Esc} to leave Insert mode. When in doubt, hit {Esc}. It always takes you home.',
      },
    ],
    keys: [
      { keys: 'i', desc: 'Insert before the cursor' },
      { keys: 'Esc', desc: 'Return to Normal mode' },
    ],
    challenges: [
      {
        title: 'Step into Insert mode',
        prompt: 'You are in Normal mode. Press {i} and watch the mode badge change to **Insert**.',
        start: '▮Hello, Vim!',
        goal: 'mode',
        mode: 'insert',
        solution: 'i',
      },
      {
        title: 'Head back home',
        prompt: 'Now you are in Insert mode. Press {Esc} to return to **Normal** mode.',
        start: 'Hello, Vim▮!',
        startMode: 'insert',
        goal: 'mode',
        mode: 'normal',
        solution: '<Esc>',
      },
      {
        title: 'Say hello',
        prompt: 'Press {i}, type `Hello`, then press {Esc} to finish in Normal mode.',
        start: '▮, world!',
        goal: 'text',
        target: 'Hello, world!',
        solution: 'iHello<Esc>',
        hint: 'Text you type in Insert mode goes before the cursor.',
      },
      {
        title: 'Fill the gap',
        prompt: 'Make the sentence read `Vim is really fun`. Insert, type, escape.',
        start: 'Vim is ▮fun',
        goal: 'text',
        target: 'Vim is really fun',
        solution: 'ireally <Esc>',
        hint: "Don't forget the space after `really`.",
      },
      {
        title: 'Press any key',
        prompt: 'One more round trip: make it read `Press the any key`.',
        start: 'Press the ▮key',
        goal: 'text',
        target: 'Press the any key',
        solution: 'iany <Esc>',
      },
    ],
  },
  {
    id: 'hjkl',
    title: 'Moving with h j k l',
    tagline: 'Home-row arrows',
    chapter: 1,
    icon: 'move',
    briefing: [
      {
        title: 'Hands stay home',
        body: 'Vim moves the cursor from the home row. {h} goes left, {l} goes right, {j} goes down and {k} goes up.',
      },
      {
        title: 'A memory trick',
        body: '{j} has a hook that points down. {h} is on the left and {l} is on the right. That leaves {k} for up.',
      },
      {
        title: 'Collect the gems',
        body: 'Green gems mark where you need to go. Land on every gem to clear the board. Walls are solid.',
      },
    ],
    keys: [
      { keys: 'h', desc: 'Left' },
      { keys: 'j', desc: 'Down' },
      { keys: 'k', desc: 'Up' },
      { keys: 'l', desc: 'Right' },
    ],
    challenges: [
      {
        title: 'Side to side',
        prompt: 'Use {h} and {l} to collect both gems.',
        start: '◆mind ▮the ga◆p',
        goal: 'reach',
        solution: 'hhhhhlllllllllll',
        allowed: ['h', 'l'],
      },
      {
        title: 'Up and down',
        prompt: 'Use {j} and {k} (plus {h} {l}) to collect the gems.',
        start: '▮row one\nrow two\nrow ◆three\nrow four\n◆row five',
        goal: 'reach',
        solution: 'jjjjkkllll',
        allowed: HJKL,
      },
      {
        title: 'Gem garden',
        prompt: 'Collect all three gems. Order is up to you.',
        start: '·◆·······\n·········\n▮·····◆···\n·········\n······◆··',
        goal: 'reach',
        solution: 'kkljjlllljjl',
        allowed: HJKL,
      },
      {
        title: 'The maze',
        prompt: 'Reach the gem. Walls (`#`) block your way.',
        start: '#########\n#▮···#···#\n#·#·#·#·#\n#·#···#◆·#\n#########',
        goal: 'reach',
        walls: '#',
        solution: 'lljjllkklljj',
        allowed: HJKL,
      },
    ],
  },
  {
    id: 'insert-commands',
    title: 'More ways to insert',
    tagline: 'a, A, I, o and O',
    chapter: 1,
    icon: 'cursor',
    briefing: [
      {
        title: 'Insert exactly where you want',
        body: '{i} inserts before the cursor. {a} appends after it. Capital versions work on the whole line: {I} jumps to the start, {A} to the end.',
      },
      {
        title: 'Open new lines',
        body: '{o} opens a new line below and drops you into Insert mode. {O} does the same above.',
      },
    ],
    keys: [
      { keys: 'a', desc: 'Append after cursor' },
      { keys: 'A', desc: 'Append at end of line' },
      { keys: 'I', desc: 'Insert at line start' },
      { keys: 'o', desc: 'Open line below' },
      { keys: 'O', desc: 'Open line above' },
    ],
    challenges: [
      {
        title: 'Append with a',
        prompt: 'Make it plural: press {a}, type `s`, {Esc}.',
        start: 'Two ca▮t',
        goal: 'text',
        target: 'Two cats',
        solution: 'as<Esc>',
      },
      {
        title: 'Semicolon please',
        prompt: 'Add a `;` at the end of the line with {A}. The cursor can be anywhere.',
        start: '▮console.log("hi")',
        goal: 'text',
        target: 'console.log("hi");',
        solution: 'A;<Esc>',
      },
      {
        title: 'Check it off',
        prompt: 'Prefix the task with `[x] ` using {I}.',
        start: '  done: refactor ▮auth',
        goal: 'text',
        target: '  [x] done: refactor auth',
        solution: 'I[x] <Esc>',
        hint: '{I} skips leading spaces and inserts at the first character.',
      },
      {
        title: 'Open below',
        prompt: 'Add `- bread` on a new line between milk and eggs.',
        start: '▮- milk\n- eggs',
        goal: 'text',
        target: '- milk\n- bread\n- eggs',
        solution: 'o- bread<Esc>',
      },
      {
        title: 'Open above',
        prompt: 'Add the comment `# says hi` above the function.',
        start: 'def ▮greet():\n    print("hi")',
        goal: 'text',
        target: '# says hi\ndef greet():\n    print("hi")',
        solution: 'O# says hi<Esc>',
      },
    ],
  },
  {
    id: 'word-motions',
    title: 'Word motions',
    tagline: 'Hop, don’t crawl',
    chapter: 2,
    icon: 'footprints',
    briefing: [
      {
        title: 'Think in words',
        body: '{w} jumps to the start of the next word, {b} back to the start of the previous one, and {e} to the end of the word.',
      },
      {
        title: 'Big WORDs',
        body: 'Punctuation counts as its own word for {w}. The capital versions {W} {B} {E} only stop at whitespace, which is handy in code.',
      },
    ],
    keys: [
      { keys: 'w', desc: 'Next word start' },
      { keys: 'b', desc: 'Previous word start' },
      { keys: 'e', desc: 'Word end' },
      { keys: 'W B E', desc: 'Same, whitespace-separated' },
    ],
    challenges: [
      {
        title: 'Hop forward',
        prompt: 'Collect the gems using only {w}.',
        start: '▮The ◆quick brown ◆fox jumps over the ◆lazy dog',
        goal: 'reach',
        solution: 'wwwwwww',
        allowed: ['w'],
      },
      {
        title: 'Hop back',
        prompt: 'Get to `brown` with {b}.',
        start: 'The quick ◆brown fox jumps over the lazy ▮dog',
        goal: 'reach',
        solution: 'bbbbbb',
        allowed: ['b'],
      },
      {
        title: 'Land on the ends',
        prompt: 'Collect the word endings with {e}.',
        start: '▮Ever◆y keystrok◆e count◆s',
        goal: 'reach',
        solution: 'eee',
        allowed: ['e'],
      },
      {
        title: 'Through the dots',
        prompt: '{w} stops at every `.` here. Use {W} to get to `data` in two hops.',
        start: '▮user.profile.name = ◆data;',
        goal: 'reach',
        solution: 'WW',
        allowed: ['w', 'W', 'b', 'B', 'e', 'E'],
      },
      {
        title: 'Mix it up',
        prompt: 'Collect all three gems with {w}, {b} and {e}.',
        start: '◆Practice ▮makes progress, ◆not perfectio◆n.',
        goal: 'reach',
        solution: 'bwwwwee',
        allowed: ['w', 'b', 'e', 'W', 'B', 'E'],
      },
    ],
  },
  {
    id: 'line-jumps',
    title: 'Line jumps & counts',
    tagline: '0, ^, $, gg, G and numbers',
    chapter: 2,
    icon: 'arrows',
    briefing: [
      {
        title: 'Edges of a line',
        body: '{0} goes to the very first column, {^} to the first non-blank character, and {$} to the end of the line.',
      },
      {
        title: 'Edges of the file',
        body: '{g}{g} jumps to the first line, {G} to the last. Put a number first to jump to a specific line: {4}{G}.',
      },
      {
        title: 'Counts multiply',
        body: 'Most motions take a count. {5}{j} moves down five lines and {3}{w} hops three words.',
      },
    ],
    keys: [
      { keys: '0', desc: 'Line start' },
      { keys: '^', desc: 'First non-blank' },
      { keys: '$', desc: 'Line end' },
      { keys: 'gg', desc: 'First line' },
      { keys: 'G', desc: 'Last line (or line N with a count)' },
    ],
    challenges: [
      {
        title: 'To the end',
        prompt: 'Jump straight to the end of the line with {$}.',
        start: '▮The cursor wants to be at the very en◆d',
        goal: 'reach',
        solution: '$',
      },
      {
        title: 'Skip the indent',
        prompt: 'Jump to the first real character with {^}.',
        start: '    ◆return result▮;',
        goal: 'reach',
        solution: '^',
      },
      {
        title: 'Top and bottom',
        prompt: 'Visit the first and last lines with {g}{g} and {G}.',
        start: '◆import { app } from "./app"\n\nconst port = 3000\n▮app.listen(port)\n\n◆export default app',
        goal: 'reach',
        solution: 'ggG',
        allowed: ['g', 'G', '0', '^', '$'],
      },
      {
        title: 'Count your steps',
        prompt: 'Use counts like {5}{j} to collect both gems quickly.',
        start: '▮line 1\nline 2\nline 3\nline 4\nline 5\n◆line 6\nline 7\n◆line 8',
        goal: 'reach',
        solution: '5j2j',
        allowed: ['j', 'k', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'G', 'g'],
      },
      {
        title: 'Seven hops',
        prompt: 'Reach `eight` in two keystrokes.',
        start: '▮one two three four five six seven ◆eight',
        goal: 'reach',
        solution: '7w',
      },
    ],
  },
  {
    id: 'find',
    title: 'Find in line',
    tagline: 'f, t, F, T, ; and ,',
    chapter: 2,
    icon: 'crosshair',
    briefing: [
      {
        title: 'Snipe a character',
        body: '{f} followed by a character jumps onto the next occurrence on the line. {t} stops just before it.',
      },
      {
        title: 'Backwards and again',
        body: '{F} and {T} search backwards. {;} repeats the last find and {,} repeats it in the other direction.',
      },
    ],
    keys: [
      { keys: 'f{c}', desc: 'Jump onto next c' },
      { keys: 't{c}', desc: 'Jump to just before c' },
      { keys: 'F T', desc: 'Same, backwards' },
      { keys: '; ,', desc: 'Repeat / reverse' },
    ],
    challenges: [
      {
        title: 'Snipe the paren',
        prompt: 'Jump onto the `(` with {f}{(}.',
        start: '▮const total = sum◆(items);',
        goal: 'reach',
        solution: 'f(',
        allowed: ['f', 't', 'F', 'T', ';', ',', '('],
      },
      {
        title: 'Comma hopping',
        prompt: 'Collect every comma with {f}{,} and then {;}.',
        start: '▮a◆,b◆,c◆,d',
        goal: 'reach',
        solution: 'f,;;',
        allowed: ['f', 't', 'F', 'T', ';', ','],
      },
      {
        title: 'From the back',
        prompt: 'Land on the start of the file name. Try {T}{/}.',
        start: 'src/routes/◆index.ts▮x',
        goal: 'reach',
        solution: 'T/',
      },
    ],
  },
  {
    id: 'search',
    title: 'Search',
    tagline: '/, n and N',
    chapter: 2,
    icon: 'search',
    briefing: [
      {
        title: 'Look it up',
        body: 'Press {/}, type what you are looking for and hit {Enter}. The cursor jumps to the next match.',
      },
      {
        title: 'Next, previous',
        body: '{n} goes to the next match and {N} to the previous one. Search wraps around the file.',
      },
    ],
    keys: [
      { keys: '/text', desc: 'Search forward' },
      { keys: 'n', desc: 'Next match' },
      { keys: 'N', desc: 'Previous match' },
    ],
    challenges: [
      {
        title: 'Find the needle',
        prompt: 'Search for `needle` with {/} and land on it.',
        start: '▮hay hay hay hay\nhay hay hay hay\nhay hay ◆needle hay\nhay hay hay hay',
        goal: 'reach',
        solution: '/nee<Enter>',
      },
      {
        title: 'Every TODO',
        prompt: 'Visit all three `TODO`s. Search once, then use {n}.',
        start: '▮function run() {\n  // ◆TODO: validate\n  load()\n  // ◆TODO: cache\n  render()\n  // ◆TODO: log\n}',
        goal: 'reach',
        solution: '/TODO<Enter>nn',
      },
      {
        title: 'Search and fix',
        prompt: 'Find `bug` and change it to `fix`.',
        start: '▮Release notes:\n- new dashboard\n- squashed a bug in sync',
        goal: 'text',
        target: 'Release notes:\n- new dashboard\n- squashed a fix in sync',
        solution: '/bug<Enter>cwfix<Esc>',
        hint: 'After searching, {c}{w} changes the word under the cursor.',
      },
    ],
  },
  {
    id: 'deleting',
    title: 'Deleting',
    tagline: 'x, dd and D',
    chapter: 3,
    icon: 'eraser',
    briefing: [
      {
        title: 'Small deletes',
        body: '{x} deletes the character under the cursor. Give it a count to delete more: {3}{x}.',
      },
      {
        title: 'Big deletes',
        body: '{d}{d} deletes the whole line. {D} deletes from the cursor to the end of the line.',
      },
    ],
    keys: [
      { keys: 'x', desc: 'Delete character' },
      { keys: 'dd', desc: 'Delete line' },
      { keys: 'D', desc: 'Delete to end of line' },
    ],
    challenges: [
      {
        title: 'Zap the typo',
        prompt: 'Remove the extra `o` with {x}.',
        start: 'Vim is s▮oo cool',
        goal: 'text',
        target: 'Vim is so cool',
        solution: 'x',
      },
      {
        title: 'Too many i’s',
        prompt: 'Make it read `This is fine`. Try a count: {3}{x}.',
        start: 'Th▮iiiis is fine',
        goal: 'text',
        target: 'This is fine',
        solution: '3x',
      },
      {
        title: 'Delete a line',
        prompt: 'Remove the middle line with {d}{d}.',
        start: 'keep this line\n▮delete this line\nkeep this one too',
        goal: 'text',
        target: 'keep this line\nkeep this one too',
        solution: 'dd',
      },
      {
        title: 'Trim the tail',
        prompt: 'Delete the comment with {D}.',
        start: 'const x = 42;▮ // remove me',
        goal: 'text',
        target: 'const x = 42;',
        solution: 'D',
      },
      {
        title: 'Dedupe',
        prompt: 'Remove both `DUPLICATE` lines.',
        start: '- apples\n▮- DUPLICATE\n- bananas\n- DUPLICATE\n- cherries',
        goal: 'text',
        target: '- apples\n- bananas\n- cherries',
        solution: 'ddjdd',
      },
    ],
  },
  {
    id: 'undo-redo',
    title: 'Undo, redo & repeat',
    tagline: 'u, Ctrl-r and the mighty dot',
    chapter: 3,
    icon: 'undo',
    briefing: [
      {
        title: 'Time travel',
        body: '{u} undoes the last change. {Ctrl-r} redoes it. Everything you type between {i} and {Esc} counts as one change.',
      },
      {
        title: 'The dot command',
        body: '{.} repeats your last change. Delete a line, move, press {.}, and it happens again.',
      },
    ],
    keys: [
      { keys: 'u', desc: 'Undo' },
      { keys: 'Ctrl-r', desc: 'Redo' },
      { keys: '.', desc: 'Repeat last change' },
    ],
    challenges: [
      {
        title: 'Oops',
        prompt: 'Delete the first line with {d}{d}, then bring it back with {u}.',
        start: '▮Important: never lose this line\nThis one is fine',
        goal: 'text',
        target: 'Important: never lose this line\nThis one is fine',
        mustUse: ['d', 'u'],
        solution: 'ddu',
      },
      {
        title: 'Changed my mind',
        prompt: 'Delete the `X` with {x}, undo with {u}, then redo with {Ctrl-r}.',
        start: 'Remove the ▮X.',
        goal: 'text',
        target: 'Remove the .',
        mustUse: ['u', 'C-r'],
        solution: 'xu<C-r>',
      },
      {
        title: 'Dot, dot, dot',
        prompt: 'Delete every comma. Use {x} once, then {.} for the rest.',
        start: 'a▮,b,c,d',
        goal: 'text',
        target: 'abcd',
        mustUse: ['.'],
        solution: 'xl.l.',
      },
      {
        title: 'Take out the trash',
        prompt: 'Delete the three `junk` lines with {d}{d} and {.}.',
        start: '▮junk\njunk\njunk\nkeep me',
        goal: 'text',
        target: 'keep me',
        mustUse: ['.'],
        solution: 'dd..',
      },
    ],
  },
  {
    id: 'operators',
    title: 'Operators + motions',
    tagline: 'The grammar of Vim',
    chapter: 3,
    icon: 'zap',
    briefing: [
      {
        title: 'Verb + noun',
        body: 'Operators like {d} (delete), {c} (change) and {y} (yank) wait for a motion. {d}{w} deletes a word and {c}{$} changes to the end of the line.',
      },
      {
        title: 'Counts fit in',
        body: '{d}{3}{w} deletes three words. Doubling an operator acts on the whole line: {d}{d}, {c}{c}, {y}{y}.',
      },
    ],
    keys: [
      { keys: 'd{motion}', desc: 'Delete' },
      { keys: 'c{motion}', desc: 'Change (delete + insert)' },
      { keys: 'cc', desc: 'Change whole line' },
    ],
    challenges: [
      {
        title: 'Delete a word',
        prompt: 'Remove `really ` with {d}{w}.',
        start: 'This is ▮really a good sentence',
        goal: 'text',
        target: 'This is a good sentence',
        solution: 'dw',
      },
      {
        title: 'Cut the rest',
        prompt: 'Delete to the end of the line with {d}{$}.',
        start: 'keep this part▮ and drop the rest',
        goal: 'text',
        target: 'keep this part',
        solution: 'd$',
      },
      {
        title: 'Change a word',
        prompt: 'Turn `slow` into `quick` with {c}{w}.',
        start: 'The ▮slow fox',
        goal: 'text',
        target: 'The quick fox',
        solution: 'cwquick<Esc>',
      },
      {
        title: 'Three at once',
        prompt: 'Delete `one two three ` in one command.',
        start: 'Remove ▮one two three words',
        goal: 'text',
        target: 'Remove words',
        solution: 'd3w',
      },
      {
        title: 'Rewrite the rest',
        prompt: 'Change the value to `"published"` with {c}{$}.',
        start: 'status = ▮"draft"',
        goal: 'text',
        target: 'status = "published"',
        solution: 'c$"published"<Esc>',
        hint: '{c}{$} keeps the start of the line. {c}{c} would rewrite all of it.',
      },
    ],
  },
  {
    id: 'yank-put',
    title: 'Yank & put',
    tagline: 'Copy and paste, Vim style',
    chapter: 3,
    icon: 'clipboard',
    briefing: [
      {
        title: 'Yank is copy',
        body: '{y} is an operator: {y}{w} yanks a word and {y}{y} yanks a line. Deletes are yanked too, so {d}{d} is really cut.',
      },
      {
        title: 'Put it back',
        body: '{p} puts after the cursor (or below the line). {P} puts before (or above).',
      },
    ],
    keys: [
      { keys: 'yy', desc: 'Yank line' },
      { keys: 'y{motion}', desc: 'Yank motion' },
      { keys: 'p', desc: 'Put after' },
      { keys: 'P', desc: 'Put before' },
    ],
    challenges: [
      {
        title: 'Double it',
        prompt: 'Duplicate the line with {y}{y} then {p}.',
        start: '▮echo hello',
        goal: 'text',
        target: 'echo hello\necho hello',
        solution: 'yyp',
      },
      {
        title: 'Swap lines',
        prompt: 'Put `first` first. Cut with {d}{d} and put with {p}.',
        start: '▮second\nfirst\nthird',
        goal: 'text',
        target: 'first\nsecond\nthird',
        solution: 'ddp',
      },
      {
        title: 'Stutter',
        prompt: 'Make it say `hello hello world` with {y}{w} and {P}.',
        start: '▮hello world',
        goal: 'text',
        target: 'hello hello world',
        solution: 'ywP',
      },
      {
        title: 'Alphabetize',
        prompt: 'Move `a` above `b`.',
        start: 'b\n▮a\nc',
        goal: 'text',
        target: 'a\nb\nc',
        solution: 'ddkP',
      },
    ],
  },
  {
    id: 'quick-edits',
    title: 'Quick edits',
    tagline: 'r, ~ and J',
    chapter: 3,
    icon: 'wand',
    briefing: [
      {
        title: 'Replace one',
        body: '{r} followed by a character replaces the character under the cursor without leaving Normal mode.',
      },
      {
        title: 'Case and joins',
        body: '{~} flips the case of the character under the cursor. {J} joins the next line onto this one.',
      },
    ],
    keys: [
      { keys: 'r{c}', desc: 'Replace character' },
      { keys: '~', desc: 'Toggle case' },
      { keys: 'J', desc: 'Join lines' },
    ],
    challenges: [
      {
        title: 'Cat to bat',
        prompt: 'Replace `c` with `b` using {r}.',
        start: 'The ▮cat sat',
        goal: 'text',
        target: 'The bat sat',
        solution: 'rb',
      },
      {
        title: 'Capitalize',
        prompt: 'Capitalize the first letter with {~}.',
        start: '▮vim is great',
        goal: 'text',
        target: 'Vim is great',
        solution: '~',
      },
      {
        title: 'Join the club',
        prompt: 'Join the two lines into one with {J}.',
        start: '▮hello\nworld',
        goal: 'text',
        target: 'hello world',
        solution: 'J',
      },
    ],
  },
  {
    id: 'text-objects',
    title: 'Text objects',
    tagline: 'iw, aw, i", i(',
    chapter: 4,
    icon: 'brackets',
    briefing: [
      {
        title: 'Inside and around',
        body: 'After an operator, {i} means **inside** and {a} means **around**. {c}{i}{w} changes the word under the cursor, wherever the cursor is in it.',
      },
      {
        title: 'Pairs',
        body: 'Text objects work on quotes and brackets: {d}{i}{"} empties a string and {c}{i}{(} rewrites function arguments.',
      },
    ],
    keys: [
      { keys: 'iw aw', desc: 'Inner / around word' },
      { keys: 'i" a"', desc: 'Inside / around quotes' },
      { keys: 'i( a(', desc: 'Inside / around parens' },
      { keys: 'i{ a{', desc: 'Inside / around braces' },
    ],
    challenges: [
      {
        title: 'Change from the middle',
        prompt: 'Change `middle` to `center` with {c}{i}{w}.',
        start: 'The cursor is in the mi▮ddle of a word',
        goal: 'text',
        target: 'The cursor is in the center of a word',
        solution: 'ciwcenter<Esc>',
      },
      {
        title: 'New message',
        prompt: 'Replace the string contents with `Goodbye`.',
        start: 'msg = "▮Hello there"',
        goal: 'text',
        target: 'msg = "Goodbye"',
        solution: 'ci"Goodbye<Esc>',
      },
      {
        title: 'New arguments',
        prompt: 'Replace the arguments with `x`.',
        start: 'fn(▮a, b, c)',
        goal: 'text',
        target: 'fn(x)',
        solution: 'ci(x<Esc>',
      },
      {
        title: 'Extra extra',
        prompt: 'Delete the duplicated word with {d}{a}{w}.',
        start: 'This sentence has an ▮extra extra word',
        goal: 'text',
        target: 'This sentence has an extra word',
        solution: 'daw',
      },
      {
        title: 'Empty the object',
        prompt: 'Delete everything inside the braces.',
        start: 'const cfg = { ▮debug: true }',
        goal: 'text',
        target: 'const cfg = {}',
        solution: 'di{',
      },
    ],
  },
  {
    id: 'visual',
    title: 'Visual mode',
    tagline: 'Select first, act second',
    chapter: 4,
    icon: 'highlighter',
    briefing: [
      {
        title: 'See what you change',
        body: '{v} starts a character selection and {V} selects whole lines. Move with any motion to grow the selection.',
      },
      {
        title: 'Then act',
        body: 'Press an operator like {d}, {y}, {c} or {~} to apply it to the selection. {Esc} cancels.',
      },
    ],
    keys: [
      { keys: 'v', desc: 'Visual (characters)' },
      { keys: 'V', desc: 'Visual (lines)' },
      { keys: 'o', desc: 'Jump to other end' },
    ],
    challenges: [
      {
        title: 'Cut it out',
        prompt: 'Select `REMOVE ME ` with {v} and a motion, then press {d}.',
        start: 'Keep this ▮REMOVE ME part',
        goal: 'text',
        target: 'Keep this part',
        solution: 'veeld',
      },
      {
        title: 'Lines at a time',
        prompt: 'Delete the three middle lines with {V}.',
        start: 'header\n▮one\ntwo\nthree\nfooter',
        goal: 'text',
        target: 'header\nfooter',
        solution: 'Vjjd',
      },
      {
        title: 'Turn it up',
        prompt: 'Make `loud` uppercase: select it and press {~}.',
        start: 'make this ▮loud',
        goal: 'text',
        target: 'make this LOUD',
        solution: 've~',
      },
      {
        title: 'Status update',
        prompt: 'Select to the end of the line and change it to `passing`.',
        start: 'build: ▮broken since tuesday',
        goal: 'text',
        target: 'build: passing',
        solution: 'v$cpassing<Esc>',
      },
    ],
  },
]

export function lessonById(id: string) {
  return lessons.find((l) => l.id === id)
}

export function lessonIndex(id: string) {
  return lessons.findIndex((l) => l.id === id)
}

export function parseStart(start: string) {
  let text = ''
  let cursor = 0
  const targets: number[] = []
  for (const ch of start) {
    if (ch === '▮') cursor = text.length
    else if (ch === '◆') targets.push(text.length)
    else text += ch
  }
  return { text, cursor, targets }
}
