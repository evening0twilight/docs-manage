# WebSocket API 前端集成文档

> **目标读者**: 前端开发者  
> **版本**: v1.0.0  
> **最后更新**: 2024-01-10

本文档详细说明如何在前端项目中集成 WebSocket 实时协作功能，包括文档编辑同步、光标位置共享、在线用户管理等。

---

## 📦 1. 安装依赖

```bash
npm install socket.io-client
# 或者
pnpm add socket.io-client
# 或者
yarn add socket.io-client
```

推荐版本：`socket.io-client ^4.5.0` 或更高

---

## 🔌 2. 建立连接

### 2.1 基础连接

```typescript
import { io, Socket } from 'socket.io-client';

// 开发环境
const SOCKET_URL = 'http://localhost:3000/ws';

// 生产环境
// const SOCKET_URL = 'https://onespecial.me/ws';

const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'], // 优先使用 websocket
  reconnection: true,                   // 自动重连
  reconnectionDelay: 1000,              // 重连延迟（毫秒）
  reconnectionAttempts: 5,              // 最大重连次数
  timeout: 10000,                       // 连接超时（毫秒）
});

// 监听连接成功
socket.on('connected', (data) => {
  console.log('WebSocket 连接成功:', data);
  // data: { message: string, socketId: string, timestamp: string }
});

// 监听连接错误
socket.on('connect_error', (error) => {
  console.error('WebSocket 连接失败:', error);
});

// 监听断开连接
socket.on('disconnect', (reason) => {
  console.log('WebSocket 断开连接:', reason);
});
```

### 2.2 带 JWT 认证的连接

```typescript
import { io, Socket } from 'socket.io-client';

const token = localStorage.getItem('access_token'); // 从存储中获取 JWT token

const socket: Socket = io(SOCKET_URL, {
  auth: {
    token: `Bearer ${token}`, // 方式1：通过 auth 传递
  },
  // 或者通过查询参数传递
  query: {
    token: `Bearer ${token}`, // 方式2：通过 query 传递
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
});

// 连接后进行身份认证
socket.on('connected', () => {
  socket.emit('authenticate', {
    userId: 'user-123',
    username: '张三',
    avatar: 'https://example.com/avatar.jpg', // 可选
  });
});

// 监听认证结果
socket.on('authenticated', (data) => {
  console.log('认证成功:', data);
  // data: { success: true, userId: string, username: string, socketId: string, color: string }
});
```

---

## 👥 3. 文档房间管理

### 3.1 加入文档房间

当用户打开文档时，需要加入对应的文档房间：

```typescript
function joinDocument(documentId: string) {
  socket.emit('join-document', { documentId });
}

// 监听加入成功
socket.on('joined-document', (data) => {
  console.log('成功加入文档:', data);
  // data: {
  //   success: true,
  //   documentId: string,
  //   users: Array<{ userId: string, username: string, avatar?: string, color: string }>
  // }
  
  // 显示当前在线用户列表
  const onlineUsers = data.users;
  updateUserList(onlineUsers);
});

// 监听其他用户加入
socket.on('user-joined', (data) => {
  console.log('用户加入:', data);
  // data: {
  //   userId: string,
  //   username: string,
  //   avatar?: string,
  //   socketId: string,
  //   color: string,
  //   documentId: string
  // }
  
  // 添加新用户到在线列表
  addUserToList(data);
  showNotification(`${data.username} 加入了文档`);
});
```

### 3.2 离开文档房间

当用户关闭文档时，需要离开房间：

```typescript
function leaveDocument(documentId: string) {
  socket.emit('leave-document', { documentId });
}

// 监听离开成功
socket.on('left-document', (data) => {
  console.log('已离开文档:', data);
  // data: { success: true, documentId: string }
});

// 监听其他用户离开
socket.on('user-left', (data) => {
  console.log('用户离开:', data);
  // data: {
  //   userId: string,
  //   username: string,
  //   socketId: string,
  //   documentId: string,
  //   remainingUsers: Array<UserInfo>
  // }
  
  // 从在线列表中移除用户
  removeUserFromList(data.userId);
  showNotification(`${data.username} 离开了文档`);
});
```

### 3.3 组件生命周期集成（React 示例）

```typescript
import { useEffect } from 'react';

function DocumentEditor({ documentId }: { documentId: string }) {
  useEffect(() => {
    // 组件挂载：加入文档房间
    socket.emit('join-document', { documentId });

    // 组件卸载：离开文档房间
    return () => {
      socket.emit('leave-document', { documentId });
    };
  }, [documentId]);

  return <div>文档编辑器...</div>;
}
```

---

## ✏️ 4. 文档协作事件

### 4.1 发送文档编辑

当本地用户编辑文档时，广播编辑操作：

```typescript
interface DocumentEdit {
  documentId: string;
  type: 'insert' | 'delete' | 'replace';
  content: string;
  position: { line: number; column: number };
}

function sendDocumentEdit(edit: DocumentEdit) {
  socket.emit('document-edit', {
    ...edit,
    timestamp: Date.now(),
  });
}

// 示例：用户在第 5 行第 10 列插入 "Hello"
sendDocumentEdit({
  documentId: 'doc-123',
  type: 'insert',
  content: 'Hello',
  position: { line: 5, column: 10 },
});
```

### 4.2 接收远程编辑

监听其他用户的编辑操作并应用到本地：

```typescript
socket.on('document-edit', (data) => {
  console.log('收到远程编辑:', data);
  // data: {
  //   userId: string,
  //   username: string,
  //   type: 'insert' | 'delete' | 'replace',
  //   content: string,
  //   position: { line: number, column: number },
  //   timestamp: number,
  //   socketId: string
  // }

  // 应用编辑到编辑器
  applyRemoteEdit(data);
});

function applyRemoteEdit(edit: any) {
  const { type, content, position } = edit;

  switch (type) {
    case 'insert':
      editor.insertText(content, position);
      break;
    case 'delete':
      editor.deleteText(position, content.length);
      break;
    case 'replace':
      editor.replaceText(content, position);
      break;
  }
}
```

---

## 🖱️ 5. 光标和选区同步

### 5.1 发送光标位置

当用户移动光标时，实时发送光标位置：

```typescript
function sendCursorPosition(documentId: string, position: { line: number; column: number }) {
  socket.emit('cursor-position', {
    documentId,
    position,
  });
}

// 监听编辑器光标移动
editor.onCursorMove((position) => {
  sendCursorPosition(currentDocumentId, position);
});
```

### 5.2 接收远程光标

监听其他用户的光标位置并显示：

```typescript
socket.on('cursor-position', (data) => {
  console.log('收到光标位置:', data);
  // data: {
  //   userId: string,
  //   username: string,
  //   position: { line: number, column: number },
  //   color: string,
  //   socketId: string
  // }

  // 渲染远程光标
  renderRemoteCursor(data);
});

function renderRemoteCursor(cursor: any) {
  const { userId, username, position, color } = cursor;

  // 在编辑器中显示光标
  const cursorElement = document.createElement('div');
  cursorElement.id = `cursor-${userId}`;
  cursorElement.style.position = 'absolute';
  cursorElement.style.borderLeft = `2px solid ${color}`;
  cursorElement.style.height = '20px';
  cursorElement.innerHTML = `<span style="color: ${color}; font-size: 12px;">${username}</span>`;

  // 计算光标位置并插入 DOM
  const coordinates = editor.getCoordinatesFromPosition(position);
  cursorElement.style.left = `${coordinates.x}px`;
  cursorElement.style.top = `${coordinates.y}px`;
  editor.container.appendChild(cursorElement);
}
```

### 5.3 发送选区变化

```typescript
function sendSelection(documentId: string, selection: {
  start: { line: number; column: number };
  end: { line: number; column: number };
}) {
  socket.emit('selection-change', {
    documentId,
    selection,
  });
}

// 监听编辑器选区变化
editor.onSelectionChange((selection) => {
  sendSelection(currentDocumentId, selection);
});
```

### 5.4 接收远程选区

```typescript
socket.on('selection-change', (data) => {
  console.log('收到选区变化:', data);
  // data: {
  //   userId: string,
  //   username: string,
  //   selection: { start: {...}, end: {...} },
  //   color: string,
  //   socketId: string
  // }

  // 高亮显示远程用户的选区
  renderRemoteSelection(data);
});
```

---

## ⌨️ 6. 输入状态指示

### 6.1 发送输入状态

```typescript
let typingTimeout: NodeJS.Timeout;

function handleTypingStart(documentId: string) {
  // 发送"正在输入"状态
  socket.emit('typing', {
    documentId,
    isTyping: true,
  });

  // 3 秒后自动发送"停止输入"
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', {
      documentId,
      isTyping: false,
    });
  }, 3000);
}

// 监听键盘输入
editor.onKeyPress(() => {
  handleTypingStart(currentDocumentId);
});
```

### 6.2 接收输入状态

```typescript
socket.on('user-typing', (data) => {
  console.log('用户输入状态:', data);
  // data: {
  //   userId: string,
  //   username: string,
  //   isTyping: boolean,
  //   socketId: string
  // }

  // 显示/隐藏输入指示器
  if (data.isTyping) {
    showTypingIndicator(data.username);
  } else {
    hideTypingIndicator(data.userId);
  }
});

function showTypingIndicator(username: string) {
  const indicator = document.getElementById('typing-indicator');
  indicator.textContent = `${username} 正在输入...`;
  indicator.style.display = 'block';
}
```

---

## 💬 7. 文档聊天功能

### 7.1 发送聊天消息

```typescript
function sendChatMessage(documentId: string, message: string) {
  socket.emit('chat-message', {
    documentId,
    message,
  });
}

// 示例：发送消息
sendChatMessage('doc-123', '大家好！');
```

### 7.2 接收聊天消息

```typescript
socket.on('chat-message', (data) => {
  console.log('收到聊天消息:', data);
  // data: {
  //   userId: string,
  //   username: string,
  //   avatar?: string,
  //   message: string,
  //   timestamp: string,
  //   socketId: string
  // }

  // 显示消息
  appendMessageToChat(data);
});

function appendMessageToChat(msg: any) {
  const chatBox = document.getElementById('chat-messages');
  const messageElement = document.createElement('div');
  messageElement.innerHTML = `
    <div class="message">
      <img src="${msg.avatar}" alt="${msg.username}" />
      <div>
        <strong>${msg.username}</strong>
        <span>${new Date(msg.timestamp).toLocaleTimeString()}</span>
        <p>${msg.message}</p>
      </div>
    </div>
  `;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}
```

---

## 🚨 8. 错误处理

### 8.1 监听错误事件

```typescript
socket.on('error', (error) => {
  console.error('WebSocket 错误:', error);
  // error: { message: string }

  // 显示错误提示
  alert(`错误: ${error.message}`);
});
```

### 8.2 连接失败处理

```typescript
socket.on('connect_error', (error) => {
  console.error('连接失败:', error.message);

  // 检查 token 是否过期
  if (error.message.includes('unauthorized') || error.message.includes('401')) {
    // 跳转到登录页
    window.location.href = '/login';
  }
});
```

### 8.3 重连处理

```typescript
socket.on('reconnect', (attemptNumber) => {
  console.log(`重连成功 (尝试 ${attemptNumber} 次)`);

  // 重新认证
  socket.emit('authenticate', {
    userId: currentUserId,
    username: currentUsername,
  });

  // 重新加入文档房间
  if (currentDocumentId) {
    socket.emit('join-document', { documentId: currentDocumentId });
  }
});

socket.on('reconnect_failed', () => {
  console.error('重连失败，请刷新页面');
  alert('连接已断开，请刷新页面');
});
```

---

## 🔐 9. 安全最佳实践

### 9.1 Token 刷新

```typescript
// 定期检查 token 是否即将过期
setInterval(() => {
  const token = localStorage.getItem('access_token');
  const decoded = jwtDecode(token); // 使用 jwt-decode 库

  // 如果 token 在 5 分钟内过期，刷新 token
  if (decoded.exp * 1000 - Date.now() < 5 * 60 * 1000) {
    refreshToken().then((newToken) => {
      // 断开旧连接，使用新 token 重连
      socket.disconnect();
      socket.auth = { token: `Bearer ${newToken}` };
      socket.connect();
    });
  }
}, 60000); // 每分钟检查一次
```

### 9.2 XSS 防护

```typescript
// 渲染用户输入前进行转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

socket.on('chat-message', (data) => {
  const safeMessage = escapeHtml(data.message);
  appendMessageToChat({ ...data, message: safeMessage });
});
```

---

## 📊 10. 完整示例（TypeScript + React）

```typescript
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
  userId: string;
  username: string;
  avatar?: string;
  color: string;
}

function DocumentCollaboration({ documentId, token }: { documentId: string; token: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // 初始化 WebSocket 连接
  useEffect(() => {
    const newSocket = io('http://localhost:3000/ws', {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    // 连接成功
    newSocket.on('connected', () => {
      console.log('WebSocket 已连接');
      setIsConnected(true);

      // 认证
      newSocket.emit('authenticate', {
        userId: 'user-123',
        username: '张三',
      });
    });

    // 认证成功后加入文档房间
    newSocket.on('authenticated', () => {
      newSocket.emit('join-document', { documentId });
    });

    // 成功加入房间
    newSocket.on('joined-document', (data) => {
      setOnlineUsers(data.users);
    });

    // 其他用户加入
    newSocket.on('user-joined', (user) => {
      setOnlineUsers((prev) => [...prev, user]);
    });

    // 其他用户离开
    newSocket.on('user-left', (data) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    // 接收远程编辑
    newSocket.on('document-edit', (edit) => {
      console.log('收到远程编辑:', edit);
      // 应用到编辑器
      applyRemoteEdit(edit);
    });

    // 断开连接
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    // 清理：断开连接并离开房间
    return () => {
      newSocket.emit('leave-document', { documentId });
      newSocket.disconnect();
    };
  }, [documentId, token]);

  // 发送本地编辑
  const handleEdit = (content: string) => {
    if (!socket) return;

    socket.emit('document-edit', {
      documentId,
      type: 'replace',
      content,
      position: { line: 0, column: 0 },
      timestamp: Date.now(),
    });
  };

  // 应用远程编辑
  const applyRemoteEdit = (edit: any) => {
    if (editorRef.current) {
      editorRef.current.value = edit.content;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
        <h2>文档协作编辑器</h2>
        <div>
          连接状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', padding: '10px' }}>
        {/* 编辑器 */}
        <textarea
          ref={editorRef}
          style={{ flex: 1, height: '400px', fontSize: '16px' }}
          onChange={(e) => handleEdit(e.target.value)}
          placeholder="开始编辑..."
        />

        {/* 在线用户列表 */}
        <div style={{ width: '200px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>在线用户 ({onlineUsers.length})</h3>
          <ul>
            {onlineUsers.map((user) => (
              <li key={user.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: user.color,
                  }}
                />
                {user.username}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DocumentCollaboration;
```

---

## 🌐 11. 环境配置

### 开发环境

```typescript
const SOCKET_URL = 'http://localhost:3000/ws';
```

### 生产环境

```typescript
const SOCKET_URL = 'https://onespecial.me/ws';
```

### 使用环境变量（推荐）

```typescript
// .env.development
VITE_SOCKET_URL=http://localhost:3000/ws

// .env.production
VITE_SOCKET_URL=https://onespecial.me/ws
```

```typescript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const socket = io(SOCKET_URL);
```

---

## 📋 12. 事件速查表

### 客户端发送事件（Emit）

| 事件名             | 参数                                                          | 说明               |
| ------------------ | ------------------------------------------------------------- | ------------------ |
| `authenticate`     | `{ userId, username, avatar? }`                               | 用户身份认证       |
| `join-document`    | `{ documentId }`                                              | 加入文档房间       |
| `leave-document`   | `{ documentId }`                                              | 离开文档房间       |
| `document-edit`    | `{ documentId, type, content, position, timestamp }`          | 发送文档编辑       |
| `cursor-position`  | `{ documentId, position: { line, column } }`                  | 发送光标位置       |
| `selection-change` | `{ documentId, selection: { start, end } }`                   | 发送选区变化       |
| `typing`           | `{ documentId, isTyping }`                                    | 发送输入状态       |
| `chat-message`     | `{ documentId, message }`                                     | 发送聊天消息       |

### 服务端发送事件（On）

| 事件名             | 数据结构                                                      | 说明               |
| ------------------ | ------------------------------------------------------------- | ------------------ |
| `connected`        | `{ message, socketId, timestamp }`                            | 连接成功           |
| `authenticated`    | `{ success, userId, username, socketId, color }`              | 认证成功           |
| `joined-document`  | `{ success, documentId, users[] }`                            | 成功加入文档       |
| `left-document`    | `{ success, documentId }`                                     | 成功离开文档       |
| `user-joined`      | `{ userId, username, avatar, socketId, color, documentId }`   | 其他用户加入       |
| `user-left`        | `{ userId, username, socketId, documentId, remainingUsers }` | 其他用户离开       |
| `document-edit`    | `{ userId, username, type, content, position, timestamp }`    | 接收远程编辑       |
| `cursor-position`  | `{ userId, username, position, color, socketId }`             | 接收光标位置       |
| `selection-change` | `{ userId, username, selection, color, socketId }`            | 接收选区变化       |
| `user-typing`      | `{ userId, username, isTyping, socketId }`                    | 接收输入状态       |
| `chat-message`     | `{ userId, username, avatar, message, timestamp, socketId }`  | 接收聊天消息       |
| `error`            | `{ message }`                                                 | 错误消息           |

---

## 🐛 13. 常见问题

### Q1: 连接失败怎么办？

**A:** 检查以下几点：
1. 确认后端 WebSocket 服务已启动（端口 3000）
2. 检查 CORS 配置是否包含前端域名
3. 确认 JWT token 有效且格式正确（`Bearer <token>`）
4. 查看浏览器控制台是否有错误日志

### Q2: 消息延迟严重？

**A:** 优化建议：
1. 使用节流（throttle）限制光标位置更新频率（建议 100ms）
2. 避免在每次按键时都发送完整文档内容，使用增量更新
3. 检查网络延迟（使用 `socket.io-client` 的 `ping` 事件）

### Q3: 如何处理冲突编辑？

**A:** 推荐使用 Operational Transformation (OT) 或 CRDT 算法：
- 简单场景：使用 **最后写入获胜** 策略
- 复杂场景：集成 `ShareDB` 或 `Yjs` 等协同编辑库

### Q4: 用户断线后如何恢复状态？

**A:** 重连处理：
```typescript
socket.on('reconnect', () => {
  // 1. 重新认证
  socket.emit('authenticate', { userId, username });
  
  // 2. 重新加入文档房间
  socket.emit('join-document', { documentId });
  
  // 3. 请求最新文档内容
  fetchLatestDocument(documentId);
});
```

---

## 📞 14. 技术支持

如有疑问，请联系后端团队或查阅：
- **后端仓库**: [GitHub Repository](#)
- **API 文档**: [Swagger UI](http://localhost:3000/api)
- **问题反馈**: [Issue Tracker](#)

---

**文档维护**: 后端团队  
**最后更新**: 2024-01-10
