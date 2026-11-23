---
inclusion: always
---
# How to work in this repo
- Don't stop to ask questions that the steering files, docs/brief.md, or the
  spec already answer. Make the reasonable choice and note it in your summary.
- Run each shell command on its own. Don't chain commands with ; or &&.
- Use the package manager commands from tech.md. Don't invent new scripts.
- When running spec tasks, keep going through every task until they're all done
  or one fails 3 times. Don't stop to check in between tasks.
- When something fails, read the error, fix it, and retry before asking me.
- Only stop and ask me for: adding a package not in docs/speed.yml, changing
  src/contracts/, or anything that pushes, merges, or deletes.
- Finish with one short summary: what you built, tests run, choices you made.