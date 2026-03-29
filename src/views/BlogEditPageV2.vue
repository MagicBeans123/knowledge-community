<template>
  <section class="editor-wrap">
    <div class="editor-card">
      <h2>发布帖子</h2>
      <p class="sub">像 Word 一样编辑：可直接粘贴图片、插入图片、插入关联博客链接</p>

      <el-form label-width="90px" class="form-area">
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="80" placeholder="请输入帖子标题" />
        </el-form-item>

        <el-form-item label="编辑内容">
          <div class="toolbar">
            <el-button size="small" @click="triggerImagePicker">插入图片</el-button>
            <el-button size="small" @click="insertRelatedBlogLink">插入博客链接</el-button>
            <span class="tip">支持 Ctrl+V 粘贴图片</span>
          </div>

          <div
            ref="editorRef"
            class="editor-area"
            contenteditable="true"
            @input="syncEditorContent"
            @paste="handlePaste"
          ></div>
          <input ref="fileInputRef" class="hidden-input" type="file" accept="image/*" @change="handleFileInsert" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitPost">立即发布</el-button>
        </el-form-item>
      </el-form>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import http from "../api/http";

defineProps({
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const form = reactive({
  title: "",
  contentHtml: ""
});
const editorRef = ref(null);
const fileInputRef = ref(null);

const syncEditorContent = () => {
  form.contentHtml = editorRef.value?.innerHTML || "";
};

const insertHtmlAtCursor = (html) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    editorRef.value?.focus();
  }
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  if (!range) return;
  range.deleteContents();
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const fragment = document.createDocumentFragment();
  let node;
  let lastNode;
  while ((node = temp.firstChild)) {
    lastNode = fragment.appendChild(node);
  }
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.setEndAfter(lastNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  syncEditorContent();
};

const readFileToDataUrl = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

const triggerImagePicker = () => {
  fileInputRef.value?.click();
};

const handleFileInsert = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFileToDataUrl(file);
  insertHtmlAtCursor(`<p><img src="${dataUrl}" alt="${file.name}" style="max-width:100%;border-radius:8px;" /></p>`);
  event.target.value = "";
};

const handlePaste = async (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;
  event.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;
  const dataUrl = await readFileToDataUrl(file);
  insertHtmlAtCursor(`<p><img src="${dataUrl}" alt="paste-image" style="max-width:100%;border-radius:8px;" /></p>`);
};

const insertRelatedBlogLink = async () => {
  try {
    const { value } = await ElMessageBox.prompt("请输入要关联的博客ID", "插入博客链接", {
      inputPattern: /^\d+$/,
      inputErrorMessage: "博客ID必须是数字"
    });
    insertHtmlAtCursor(`<p><a href="/community/blog/${value}" target="_blank">查看关联博客 #${value}</a></p>`);
  } catch (error) {
    // user cancelled
  }
};

const submitPost = async () => {
  if (!form.title.trim()) {
    ElMessage.warning("标题不能为空");
    return;
  }
  const contentHtml = (editorRef.value?.innerHTML || "").trim();
  const pureText = (editorRef.value?.innerText || "").trim();
  if (!pureText && !contentHtml.includes("<img")) {
    ElMessage.warning("正文不能为空");
    return;
  }

  await http.post("/blog", {
    title: form.title.trim(),
    content: contentHtml
  });

  ElMessage.success("发布成功");
  form.title = "";
  form.contentHtml = "";
  if (editorRef.value) {
    editorRef.value.innerHTML = "";
  }
};
</script>

<style scoped>
.editor-wrap {
  padding: 6px 0;
}

.editor-card {
  width: 100%;
  background: #f7f3e8;
  border: 1px solid #d8d1c1;
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 10px 28px rgba(58, 67, 44, 0.14);
}

h2 {
  margin: 0;
  font-size: 34px;
  font-family: Georgia, "Times New Roman", serif;
  color: #2d3423;
}

.sub {
  margin: 10px 0 0;
  color: #656753;
}

.form-area {
  margin-top: 22px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tip {
  color: #7a7d6a;
  font-size: 12px;
}

.editor-area {
  min-height: 320px;
  background: #fff;
  border: 1px solid #ddd2ba;
  border-radius: 10px;
  padding: 12px;
  line-height: 1.7;
  outline: none;
}

.hidden-input {
  display: none;
}
</style>
