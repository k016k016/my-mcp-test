'use client'

import { useState } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'

interface WikiEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string
  showPreview?: boolean
}

export default function WikiEditor({
  value,
  onChange,
  height = '500px',
  showPreview = true,
}: WikiEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  // 将来的にダークモードを実装する場合は、next-themesを追加
  const theme = 'light'

  // Monaco準備完了をDOMに通知（E2Eテスト用）
  const handleEditorMount: OnMount = (editor) => {
    const editorDom = editor.getDomNode()
    if (editorDom) {
      editorDom.setAttribute('data-monaco-ready', 'true')
    }
  }

  return (
    <div className="w-full">
      {/* モバイル用タブ（md未満で表示） */}
      {showPreview && (
        <div className="md:hidden mb-4">
          <div className="flex border-b">
            <button
              role="tab"
              aria-selected={activeTab === 'editor'}
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              エディタ
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'preview'}
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              プレビュー
            </button>
          </div>
        </div>
      )}

      {/* デスクトップ：2カラム、モバイル：タブ切り替え */}
      <div className={showPreview ? 'md:grid md:grid-cols-2 md:gap-4' : ''}>
        {/* エディタペイン */}
        <div
          className={`border rounded-lg overflow-hidden ${
            showPreview ? `${activeTab === 'editor' ? 'block' : 'hidden'} md:block` : ''
          }`}
        >
          <div data-testid="monaco-editor" className="monaco-editor-container min-h-[280px]">
            <Editor
              height={height}
              defaultLanguage="markdown"
              value={value}
              onChange={(newValue) => onChange(newValue || '')}
              onMount={handleEditorMount}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                ariaLabel: 'Wiki editor',
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                detectIndentation: false,
                fontSize: 14,
                lineHeight: 21,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>

        {/* プレビューペイン */}
        {showPreview && (
          <div
            className={`border rounded-lg p-4 bg-white ${
              activeTab === 'preview' ? 'block' : 'hidden'
            } md:block overflow-auto markdown-preview`}
            style={{ height }}
            data-testid="markdown-preview"
          >
            <ReactMarkdown
              components={{
                h1: ({ ...props }) => (
                  <h1 className="text-3xl font-bold mt-8 mb-4 first:mt-0" {...props} />
                ),
                h2: ({ ...props }) => (
                  <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />
                ),
                h3: ({ ...props }) => (
                  <h3 className="text-xl font-bold mt-4 mb-2" {...props} />
                ),
                h4: ({ ...props }) => (
                  <h4 className="text-lg font-bold mt-3 mb-2" {...props} />
                ),
                h5: ({ ...props }) => (
                  <h5 className="text-base font-bold mt-2 mb-1" {...props} />
                ),
                h6: ({ ...props }) => (
                  <h6 className="text-sm font-bold mt-2 mb-1" {...props} />
                ),
                p: ({ ...props }) => <p className="mb-4 leading-7" {...props} />,
                ul: ({ ...props }) => (
                  <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
                ),
                ol: ({ ...props }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
                ),
                li: ({ ...props }) => <li className="ml-4" {...props} />,
                code: ({ className, ...props }) => {
                  const isInline = !className
                  return isInline ? (
                    <code
                      className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block bg-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm"
                      {...props}
                    />
                  )
                },
                pre: ({ ...props }) => <pre className="mb-4" {...props} />,
                blockquote: ({ ...props }) => (
                  <blockquote
                    className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700"
                    {...props}
                  />
                ),
                a: ({ ...props }) => (
                  <a
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                hr: ({ ...props }) => <hr className="my-8 border-gray-300" {...props} />,
                table: ({ ...props }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-gray-300" {...props} />
                  </div>
                ),
                thead: ({ ...props }) => (
                  <thead className="bg-gray-50" {...props} />
                ),
                tbody: ({ ...props }) => (
                  <tbody className="divide-y divide-gray-200" {...props} />
                ),
                tr: ({ ...props }) => <tr {...props} />,
                th: ({ ...props }) => (
                  <th
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    {...props}
                  />
                ),
                td: ({ ...props }) => (
                  <td className="px-3 py-2 text-sm text-gray-900" {...props} />
                ),
              }}
            >
              {value || '*プレビューがここに表示されます*'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
