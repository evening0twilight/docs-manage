# 智能统一更新接口 - 完整测试指南

## 🎯 功能特点

### ✅ 统一接口设计
- **一个接口**：`PUT /api/documents/{id}` 处理所有更新
- **智能识别**：系统自动判断文件夹还是文档
- **类型安全**：严格验证字段合理性
- **向后兼容**：支持多种参数组合

## 🔧 API 详情

### 端点
```
PUT /api/documents/{id}
```

### 请求头
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## 📝 使用示例

### 1. 更新文件夹

```json
PUT /api/documents/1
{
  "name": "重新命名的项目文件夹",
  "parentId": 2
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "id": 1,
    "name": "重新命名的项目文件夹",
    "itemType": "FOLDER",
    "parentId": 2,
    "updated_time": "2024-01-01T10:30:00Z"
  },
  "status": 200
}
```

### 2. 更新文档

```json
PUT /api/documents/3
{
  "title": "更新的需求文档",
  "content": "这是更新后的需求分析内容...",
  "type": "WORD",
  "parentId": 1
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "id": 3,
    "name": "更新的需求文档",
    "itemType": "DOCUMENT",
    "documentType": "WORD",
    "content": "这是更新后的需求分析内容...",
    "parentId": 1,
    "updated_time": "2024-01-01T10:31:00Z"
  },
  "status": 200
}
```

### 3. 智能兼容更新

```json
PUT /api/documents/3
{
  "name": "新的文档名称"
}
```
> 系统识别为文档后，会自动将 `name` 转换为 `title` 进行更新

### 4. 移动项目

```json
PUT /api/documents/5
{
  "parentId": 3
}
```
> 将ID为5的项目（文件夹或文档）移动到ID为3的文件夹下

### 5. 移动到根目录

```json
PUT /api/documents/7
{
  "parentId": null
}
```

## ⚠️ 错误处理

### 1. 文件夹使用文档字段 (400)
```json
PUT /api/documents/1  // 文件夹ID
{
  "title": "错误！文件夹不能有title",
  "content": "错误！文件夹不能有内容"
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "更新失败",
  "error": "文件夹不支持文档相关属性（title, content, type）",
  "status": 400
}
```

### 2. 同时使用name和title (400)
```json
PUT /api/documents/3
{
  "name": "名称A",
  "title": "名称B"  // 不能同时指定不同的name和title
}
```

### 3. 名称冲突 (409)
```json
{
  "success": false,
  "message": "更新失败",
  "error": "同一位置已存在同名文件夹",
  "status": 409
}
```

### 4. 权限不足 (403)
```json
{
  "success": false,
  "message": "更新失败",
  "error": "无权修改此项目",
  "status": 403
}
```

## 🧪 完整测试流程

### 准备工作
1. 登录获取JWT token
2. 创建测试文件夹和文档

### 测试步骤

#### Step 1: 创建测试数据
```bash
# 1. 创建根文件夹
POST /api/documents/folders
{
  "name": "测试项目",
  "parentId": null
}
# 返回ID: 1

# 2. 创建子文件夹
POST /api/documents/folders  
{
  "name": "文档目录",
  "parentId": 1
}
# 返回ID: 2

# 3. 创建文档
POST /api/documents
{
  "title": "原始文档",
  "content": "原始内容",
  "type": "TEXT",
  "parentId": 2
}
# 返回ID: 3
```

#### Step 2: 测试文件夹更新
```bash
# 重命名文件夹
PUT /api/documents/1
{
  "name": "重命名的测试项目"
}

# 移动文件夹
PUT /api/documents/2
{
  "parentId": null  # 移动到根目录
}
```

#### Step 3: 测试文档更新
```bash
# 更新文档标题和内容
PUT /api/documents/3
{
  "title": "更新的文档标题", 
  "content": "更新的文档内容...",
  "type": "WORD"
}

# 移动文档
PUT /api/documents/3
{
  "parentId": 1
}

# 使用name更新文档（智能兼容）
PUT /api/documents/3
{
  "name": "通过name更新的标题"
}
```

#### Step 4: 测试错误场景
```bash
# 尝试给文件夹设置文档属性
PUT /api/documents/1
{
  "title": "这会失败",
  "content": "这也会失败"
}
# 期望：400错误

# 尝试同时设置name和不同的title
PUT /api/documents/3
{
  "name": "名称A",
  "title": "名称B"
}
# 期望：400错误
```

## 💡 前端集成示例

### JavaScript/TypeScript
```javascript
// 统一更新函数
const updateFileSystemItem = async (id, updateData) => {
  try {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('更新成功:', result.data);
      return result.data;
    } else {
      console.error('更新失败:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
    throw error;
  }
};

// 使用示例
// 更新文件夹
await updateFileSystemItem(1, { 
  name: "新文件夹名", 
  parentId: 2 
});

// 更新文档
await updateFileSystemItem(3, { 
  title: "新文档标题",
  content: "新内容...",
  type: "WORD"
});

// 移动项目
await updateFileSystemItem(5, { 
  parentId: 7 
});
```

### Vue.js 组件示例
```vue
<template>
  <div>
    <!-- 编辑表单 -->
    <form @submit.prevent="updateItem">
      <input v-model="formData.name" placeholder="名称" v-if="item.itemType === 'FOLDER'">
      <input v-model="formData.title" placeholder="标题" v-if="item.itemType === 'DOCUMENT'">
      <textarea v-model="formData.content" v-if="item.itemType === 'DOCUMENT'"></textarea>
      <select v-model="formData.parentId">
        <option :value="null">根目录</option>
        <option v-for="folder in folders" :key="folder.id" :value="folder.id">
          {{ folder.name }}
        </option>
      </select>
      <button type="submit">更新</button>
    </form>
  </div>
</template>

<script>
export default {
  props: ['item'],
  data() {
    return {
      formData: {
        name: this.item.name,
        title: this.item.name,
        content: this.item.content,
        type: this.item.documentType,
        parentId: this.item.parentId
      }
    }
  },
  methods: {
    async updateItem() {
      try {
        const updateData = {};
        
        // 根据类型准备数据
        if (this.item.itemType === 'FOLDER') {
          updateData.name = this.formData.name;
        } else {
          updateData.title = this.formData.title;
          updateData.content = this.formData.content;
          updateData.type = this.formData.type;
        }
        
        updateData.parentId = this.formData.parentId;
        
        await updateFileSystemItem(this.item.id, updateData);
        this.$emit('updated');
      } catch (error) {
        this.$message.error(error.message);
      }
    }
  }
}
</script>
```

## ✅ 优势总结

1. **开发效率**：前端只需一个更新函数
2. **用户体验**：操作逻辑统一，易于理解
3. **类型安全**：严格的字段验证
4. **向后兼容**：支持多种参数格式
5. **错误处理**：清晰的错误信息
6. **扩展性强**：易于添加新的文件系统类型

智能统一更新接口让文件夹和文档的管理变得更加简单和高效！🎉