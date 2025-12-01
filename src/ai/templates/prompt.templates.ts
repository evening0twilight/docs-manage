// Prompt工程模板
export class PromptTemplates {
  /**
   * 润色文本的Prompt
   */
  static polish(text: string): string {
    return `请润色以下文本，使其更加流畅、专业和易读。保持原意不变，只改进表达方式。

原文：
${text}

要求：
1. 保持原文的核心意思
2. 优化语句结构，使表达更流畅
3. 使用更专业、准确的词汇
4. 直接返回润色后的文本
5. 在文本最后添加命令标记：[AI_COMMAND: replaceSelection, {"text": "润色后的完整文本"}]

请直接输出润色后的文本：`;
  }

  /**
   * 扩写内容的Prompt
   */
  static expand(text: string): string {
    return `请扩写以下内容，增加细节、例子和解释，使内容更加丰富和详细。

原文：
${text}

要求：
1. 保留原文的所有内容
2. 在原文基础上增加细节和解释
3. 可以添加相关的例子或说明
4. 保持语言风格一致
5. 在文本最后添加命令标记：[AI_COMMAND: replaceSelection, {"text": "扩写后的完整文本"}]

请直接输出扩写后的文本：`;
  }

  /**
   * 生成摘要的Prompt
   */
  static summarize(text: string): string {
    return `请为以下内容生成一个简洁的摘要，提取核心要点。

原文：
${text}

要求：
1. 提取核心观点和关键信息
2. 控制在原文30%的长度以内
3. 保持逻辑清晰
4. 使用简洁的语言

请直接输出摘要内容：`;
  }

  /**
   * 翻译文本的Prompt
   */
  static translate(text: string): string {
    // 简单检测是否包含中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    const targetLang = hasChinese ? '英文' : '中文';

    return `请将以下文本翻译成${targetLang}，保持原意和语气。

原文：
${text}

要求：
1. 准确传达原文意思
2. 使用地道的${targetLang}表达
3. 保持原文的语气和风格
4. 直接返回翻译结果
5. 在文本最后添加命令标记：[AI_COMMAND: replaceSelection, {"text": "翻译后的完整文本"}]

请直接输出翻译后的文本：`;
  }

  /**
   * 继续写作的Prompt
   */
  static continue(context: string): string {
    return `基于以下内容，请继续写作，保持风格和逻辑的连贯性。

已有内容：
${context}

要求：
1. 保持与前文风格一致
2. 内容自然流畅，逻辑连贯
3. 生成2-3段新内容
4. 在文本最后添加命令标记：[AI_COMMAND: insertText, {"text": "续写的内容"}]

请直接输出续写的内容：`;
  }

  /**
   * 通用对话的Prompt
   */
  static chat(userMessage: string, context?: any): string {
    let prompt = `你是一个专业的文档编辑助手，帮助用户编辑和优化文档内容。

用户的请求：${userMessage}`;

    if (context?.selectedText) {
      prompt += `\n\n选中的文本：\n${context.selectedText}`;
    }

    if (context?.documentContent && context.documentContent.length < 1000) {
      prompt += `\n\n当前文档内容：\n${context.documentContent}`;
    }

    prompt += `\n\n请理解用户的意图，并提供帮助。如果需要对文档进行操作，请在回复最后添加相应的命令标记。

可用的命令格式：
- 格式化加粗：[AI_COMMAND: formatBold]
- 格式化斜体：[AI_COMMAND: formatItalic]
- 格式化下划线：[AI_COMMAND: formatUnderline]
- 替换选中文本：[AI_COMMAND: replaceSelection, {"text": "新文本"}]
- 插入文本：[AI_COMMAND: insertText, {"text": "要插入的文本"}]
- 设置标题：[AI_COMMAND: setHeading, {"level": 1-6}]
- 插入无序列表：[AI_COMMAND: insertBulletList]
- 插入有序列表：[AI_COMMAND: insertOrderedList]

请回复：`;

    return prompt;
  }

  /**
   * 智能识别用户意图并生成合适的Prompt
   */
  static auto(userMessage: string, context?: any): string {
    const message = userMessage.toLowerCase();

    // 简单的意图识别
    if (message.includes('加粗') || message.includes('bold')) {
      return '好的，我将为您加粗选中的文本。\n\n[AI_COMMAND: formatBold]';
    }
    if (message.includes('斜体') || message.includes('italic')) {
      return '好的，我将为您设置斜体。\n\n[AI_COMMAND: formatItalic]';
    }
    if (message.includes('下划线') || message.includes('underline')) {
      return '好的，我将添加下划线。\n\n[AI_COMMAND: formatUnderline]';
    }
    if (message.includes('标题') || message.includes('heading')) {
      // 尝试提取级别
      const levelMatch = message.match(/[1-6]/);
      const level = levelMatch ? parseInt(levelMatch[0]) : 2;
      return `好的，我将设置为${level}级标题。\n\n[AI_COMMAND: setHeading, {"level": ${level}}]`;
    }
    if (message.includes('列表') || message.includes('list')) {
      if (
        message.includes('有序') ||
        message.includes('数字') ||
        message.includes('ordered')
      ) {
        return '好的，我将创建有序列表。\n\n[AI_COMMAND: insertOrderedList]';
      }
      return '好的，我将创建无序列表。\n\n[AI_COMMAND: insertBulletList]';
    }

    // 默认使用通用对话Prompt
    return this.chat(userMessage, context);
  }
}
