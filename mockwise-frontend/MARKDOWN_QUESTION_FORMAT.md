# Question Formatting Guide for Backend

## How to Format Questions with Markdown

When creating or updating questions in your database, use these Markdown syntax rules:

### 1. **Paragraphs & Line Breaks**
```
Single newline creates same paragraph.
Two newlines create a new paragraph.

This is a new paragraph.
```

### 2. **Bold Text**
```
**This text will be bold**
```

### 3. **Italic Text**
```
*This text will be italic*
```

### 4. **Headings**
```
# Heading 1
## Heading 2
### Heading 3
```

### 5. **Lists**
```
- Bullet point 1
- Bullet point 2
  - Nested bullet

1. Numbered item 1
2. Numbered item 2
```

### 6. **Code Inline**
```
Use `inline code` for variables or short snippets
```

### 7. **Code Blocks**
```
Use triple backticks for code blocks:
\`\`\`
function example() {
  return true;
}
\`\`\`
```

### 8. **Blockquotes**
```
> This is a quote or important note
```

---

## Example Question Format

### Description:
```markdown
Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers that add up to `target`.

You may assume that:
- Each input has **exactly one solution**
- You **cannot** use the same element twice

Return the answer in **any order**.
```

### Example:
```markdown
**Input:** `nums = [2, 7, 11, 15]`, `target = 9`  
**Output:** `[0, 1]`  
**Explanation:** Because `nums[0] + nums[1] == 9`, we return `[0, 1]`.

**Input:** `nums = [3, 2, 4]`, `target = 6`  
**Output:** `[1, 2]`
```

### Constraints:
```markdown
- `2 <= nums.length <= 10^4`
- `-10^9 <= nums[i] <= 10^9`
- `-10^9 <= target <= 10^9`
- **Only one valid answer exists**
```

---

## Tips
1. Use `**bold**` for emphasis
2. Use backticks for variable names and code
3. Use double newlines (`\n\n`) for paragraph breaks
4. Use bullet points for lists of requirements
5. Use blockquotes (`>`) for important notes
