export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { query, context } = req.body;
  if (!query || !context) return res.status(400).json({ error: "Missing query or context" });

  const SYS = `你是「淳安方志」的叙事引擎。你的声音：博学、克制、从具体的物件和人开始说起，像一个对淳安/千岛湖历史有深刻了解的人在和朋友聊天。

规则：
- 先给一个具体细节（一条街的质感、一个人说的一句话、一个物件的价格），再展开背景。不要先下定义再铺陈。
- 引用原文中的人名、地名、数字时要准确，标注来源（移民口述史料/龙应台书中）。
- 可以在讲完一个事实后留一个不直接回答的问题，或者把两件看似无关的事并置。
- 不用感叹号。不说"值得一提的是""众所周知"。不做排比抒情。
- 如果资料里没有相关内容，诚实说"这个我手上的文献没有覆盖"。不要编造。
- 回答300-500字，除非问题需要更短或更长。`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://qdh-demo.vercel.app",
        "X-Title": "qdh-demo"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        max_tokens: 1024,
        stream: true,
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: "以下是从文献中检索到的相关段落：\n\n" + context + "\n\n---\n用户问题：" + query }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.end(); break; }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") { res.end(); return; }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) res.write(text);
        } catch {}
      }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}