<template>
  <section class="editor-wrap">
    <div class="editor-card">
      <h2>发布帖子</h2>

      <el-form label-width="90px" class="form-area">
        <el-form-item label="正文" class="full-width-item">
          <div class="actions-row">
            <el-button size="small" :loading="imageUploading" @click="pickImage">上传图片</el-button>
            <el-button size="small" :loading="fileUploading" @click="pickFile">上传文件</el-button>
            <span class="tip">{{ contentLength }} / {{ maxContentLength }} 字</span>
          </div>
          <div class="editor-preview-grid">
            <textarea
              ref="textareaRef"
              v-model="form.markdown"
              class="md-input"
              spellcheck="false"
              placeholder="在此编写 Markdown…"
            ></textarea>

            <div class="preview-wrap">
              <div class="md-preview markdown-body" v-html="previewHtml"></div>
            </div>
          </div>

          <input
            ref="imageInputRef"
            class="hidden-input"
            type="file"
            accept="image/*"
            @change="onImageSelected"
          />
          <input ref="fileInputRef" class="hidden-input" type="file" @change="onFileSelected" />
        </el-form-item>

        <el-form-item label="文件列表" class="full-width-item">
          <div class="uploaded-panel">
            <p v-if="!uploadedFiles.length" class="uploaded-empty">暂无</p>
            <ul v-else class="uploaded-list">
              <li v-for="(f, i) in uploadedFiles" :key="i">
                <div class="frow">
                  <span class="fname">{{ f.name }}</span>
                  <el-button size="small" text type="danger" @click.stop="removeUploadedFile(i)">删除</el-button>
                </div>
                <code class="furl">{{ f.url }}</code>
              </li>
            </ul>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submitPost">立即发布</el-button>
        </el-form-item>
      </el-form>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { renderMarkdown } from "../utils/markdown";

defineProps({
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const maxContentLength = 2048;

const form = reactive({
  markdown: ""
});

const textareaRef = ref(null);
const imageInputRef = ref(null);
const fileInputRef = ref(null);
const submitting = ref(false);
const imageUploading = ref(false);
const fileUploading = ref(false);

const uploadedFiles = ref([]);

const previewHtml = computed(() => renderMarkdown(form.markdown));
const contentLength = computed(() => form.markdown.length);

function unwrapUploadUrl(data) {
  if (typeof data === "string") return data.trim();
  if (data && typeof data === "object") {
    const u = data.url ?? data.path ?? data.src ?? data.data;
    if (typeof u === "string") return u.trim();
  }
  return "";
}

const pickImage = () => imageInputRef.value?.click();
const pickFile = () => fileInputRef.value?.click();

function insertAtCursor(snippet) {
  const el = textareaRef.value;
  if (!el) {
    form.markdown += snippet;
    return;
  }
  const start = el.selectionStart ?? form.markdown.length;
  const end = el.selectionEnd ?? form.markdown.length;
  const before = form.markdown.slice(0, start);
  const after = form.markdown.slice(end);
  form.markdown = before + snippet + after;
  const caret = start + snippet.length;
  nextTick(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}

const onImageSelected = async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  imageUploading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", file);
    const data = await http.post("/blog/image/upload", fd);
    const url = unwrapUploadUrl(data);
    if (!url) {
      ElMessage.warning("未返回图片地址");
      return;
    }
    insertAtCursor(`\n\n![图片](${url})\n\n`);
    ElMessage.success("已插入图片");
  } catch (e) {
    ElMessage.error(e.message || "图片上传失败");
  } finally {
    imageUploading.value = false;
  }
};

const onFileSelected = async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  fileUploading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", file);
    const data = await http.post("/blog/file/upload", fd);
    const url = unwrapUploadUrl(data);
    if (!url) {
      ElMessage.warning("未返回文件地址");
      return;
    }
    uploadedFiles.value = [...uploadedFiles.value, { name: file.name, url }];
    ElMessage.success("文件已记录到底部列表");
  } catch (e) {
    ElMessage.error(e.message || "文件上传失败");
  } finally {
    fileUploading.value = false;
  }
};

const removeUploadedFile = (index) => {
  uploadedFiles.value = uploadedFiles.value.filter((_, i) => i !== index);
};

const submitPost = async () => {
  const body = form.markdown.trim();
  if (!body) {
    ElMessage.warning("正文不能为空");
    return;
  }
  if (body.length > maxContentLength) {
    ElMessage.warning(`正文过长，请控制在 ${maxContentLength} 字以内`);
    return;
  }

  const lines = body.split(/\r?\n/);
  const firstLine = (lines[0] || "").trim();
  if (!firstLine) {
    ElMessage.warning("首行不能为空，请填写标题行");
    return;
  }
  const title = firstLine.startsWith("#")
    ? firstLine.replace(/^#+\s*/, "").trim()
    : firstLine;
  if (!title) {
    ElMessage.warning("标题解析失败，请检查首行格式");
    return;
  }
  const content = lines.slice(1).join("\n").trim();
  if (!content) {
    ElMessage.warning("请在标题行下方填写正文内容");
    return;
  }

  submitting.value = true;
  try {
    const fileUrls = uploadedFiles.value
      .map((x) => (x?.url || "").trim())
      .filter(Boolean);
    await http.post("/blog", {
      title,
      content,
      file: fileUrls.join(",")
    });
    ElMessage.success("发布成功");
    form.markdown = "";
    uploadedFiles.value = [];
  } catch (error) {
    ElMessage.error(error.message || "发布失败");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.editor-wrap {
  padding: 0 0 10px;
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
}

.editor-card {
  width: 100%;
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  padding: 12px 12px 14px;
  box-shadow: var(--kc-shadow);
}

h2 {
  margin: 0;
  font-size: 34px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.form-area {
  margin-top: 12px;
}

.form-area :deep(.el-form-item__label) {
  color: var(--kc-text);
}

.full-width-item :deep(.el-form-item__content) {
  display: block;
  width: 100%;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tip {
  margin-left: auto;
  color: var(--kc-subtle);
  font-size: 12px;
}

.md-input {
  display: block;
  width: 100%;
  min-height: 70vh;
  padding: 16px 18px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 12px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 15px;
  line-height: 1.7;
  color: var(--kc-text);
  background: var(--kc-card-elevated);
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.editor-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: stretch;
}

.md-input:focus {
  border-color: var(--kc-border);
  box-shadow: 0 0 0 1px rgba(77, 92, 66, 0.2);
}

.preview-wrap {
  border: 1px solid var(--kc-border-soft);
  border-radius: 12px;
  overflow: auto;
  background: rgba(255, 253, 247, 0.7);
}

.md-preview {
  min-height: 70vh;
  max-height: 70vh;
  overflow: auto;
  padding: 16px 18px 20px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--kc-text);
}

.md-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
  margin: 12px 0;
}

.md-preview :deep(p) {
  margin: 0 0 12px;
}

.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  margin: 1em 0 0.45em;
  line-height: 1.25;
  color: var(--kc-text);
}

.md-preview :deep(ul),
.md-preview :deep(ol) {
  margin: 0 0 12px;
  padding-left: 1.4em;
}

.md-preview :deep(blockquote) {
  margin: 0 0 12px;
  padding: 8px 14px;
  border-left: 4px solid var(--kc-border);
  background: rgba(77, 92, 66, 0.06);
  color: var(--kc-muted);
}

.md-preview :deep(pre) {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #2d3423;
  color: #f3f0e9;
  overflow: auto;
  font-size: 13px;
}

.md-preview :deep(code) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.9em;
}

.md-preview :deep(pre code) {
  background: none;
  color: inherit;
}

.md-preview :deep(p code),
.md-preview :deep(li code) {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(77, 92, 66, 0.1);
}

.md-preview :deep(a) {
  color: var(--el-color-primary);
}

.uploaded-panel {
  width: 100%;
  border: 1px dashed var(--kc-border);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--kc-card-elevated);
}

.uploaded-empty {
  margin: 0;
  font-size: 13px;
  color: var(--kc-muted);
}

.uploaded-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.uploaded-list li {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(77, 92, 66, 0.05);
  border: 1px solid var(--kc-border-soft);
}

.frow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.fname {
  font-size: 13px;
  font-weight: 600;
  color: var(--kc-text);
}

.furl {
  font-size: 12px;
  word-break: break-all;
  color: var(--kc-muted);
  background: transparent;
}

.hidden-input {
  display: none;
}

@media (max-width: 768px) {
  .editor-preview-grid {
    grid-template-columns: 1fr;
  }

  .md-input,
  .md-preview {
    min-height: 50vh;
    max-height: 50vh;
  }

  .tip {
    margin-left: 0;
    width: 100%;
  }
}
</style>
