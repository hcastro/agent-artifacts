# Contributing to Agent Artifacts

Thank you for your interest in contributing! This document provides guidelines for contributing to this repository.

## Types of Contributions

### Adding a New Skill

1. **Create the skill directory:**
   ```bash
   mkdir -p skills/your-skill-name/{scripts,references,assets}
   ```

2. **Create SKILL.md** with required frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: |
     Clear description of what the skill does and when to use it.
     Include specific triggers and use cases.
   ---
   ```

3. **Add scripts** (TypeScript/JavaScript preferred):
   - Place executable scripts in `scripts/`
   - Include proper error handling
   - Document environment variables needed

4. **Add references** (optional):
   - Place documentation in `references/`
   - Keep SKILL.md lean, move detailed docs to references

5. **Test your skill** before submitting

### Adding Cursor Rules

1. Create a new `.cursorrules` file in `cursor-rules/`
2. Name it descriptively: `{language}-{framework}.cursorrules`
3. Include a comment header explaining the rules

### Improving Documentation

- Fix typos or unclear explanations
- Add examples
- Improve README files

## Code Style

### TypeScript/JavaScript

- Use TypeScript where possible
- Use ES modules (`import/export`)
- Include JSDoc comments for public functions
- Handle errors gracefully with helpful messages

### Markdown

- Use ATX-style headers (`#`, `##`, etc.)
- Include code blocks with language hints
- Keep lines under 100 characters where practical

## Pull Request Process

1. **Fork the repository** and create a feature branch
2. **Make your changes** following the guidelines above
3. **Test your changes** thoroughly
4. **Update documentation** as needed
5. **Submit a PR** with a clear description of changes

### PR Title Format

```
[type] Brief description

Types:
- [skill] - New or updated skill
- [rules] - Cursor rules
- [docs] - Documentation only
- [fix] - Bug fixes
```

### PR Description Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] New skill
- [ ] Skill update
- [ ] Cursor rules
- [ ] Documentation
- [ ] Bug fix

## Testing
How did you test these changes?

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No sensitive data (tokens, keys) included
```

## Security

**Never commit:**
- API tokens or keys
- Personal credentials
- Sensitive configuration

Always use environment variables for authentication.

## Questions?

Open an issue for questions or discussions about potential contributions.
