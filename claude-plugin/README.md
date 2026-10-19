# mermaid-link

A Claude Code plugin that adds an **Open in mermaid.drenther.xyz ↗** link below every
mermaid diagram in Claude's replies. The link opens the diagram in
[Beautiful Mermaid Viewer](https://mermaid.drenther.xyz).

The link is drawn on screen only. The stored message does not change, so the model never
sees the link and it costs no tokens.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install mermaid-link --marketplace drenther/mermaid-viewer
```

Answer `y` to add the marketplace, then choose a scope.

In the desktop app: click **+** next to the prompt box, then **Plugins**, then
**Add marketplace** with `drenther/mermaid-viewer`, then **Add plugin**.

## Notes

- The link appears when the closing fence of the diagram arrives.
- The link is clickable in terminals that support hyperlinks (iTerm2, Ghostty, kitty,
  WezTerm, VS Code).
- The diagram goes into the URL as uncompressed base64url, so a large diagram makes a
  long URL.

## Develop

```
claude --plugin-dir ./claude-plugin      # load from disk, reloads on save
claude plugin validate ./claude-plugin
claude plugin test ./claude-plugin
```
