import { css } from '@emotion/react';

// This is a global style component for the editor content
const editorStyles = css`
  .editor-content {
    .ProseMirror {
      outline: none;
      
      h1 {
        font-size: 1.8rem;
        font-weight: 700;
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
      }
      
      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-top: 1.25rem;
        margin-bottom: 0.5rem;
      }
      
      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }
      
      p {
        margin-bottom: 1rem;
        line-height: 1.6;
      }
      
      ul, ol {
        margin-left: 1.5rem;
        margin-bottom: 1rem;
      }
      
      ul {
        list-style-type: disc;
      }
      
      ol {
        list-style-type: decimal;
      }
      
      blockquote {
        border-left: 3px solid #e2e8f0;
        padding-left: 1rem;
        margin-left: 0;
        margin-right: 0;
        font-style: italic;
        color: #64748b;
      }
      
      img {
        max-width: 100%;
        height: auto;
      }
      
      table {
        border-collapse: collapse;
        table-layout: fixed;
        width: 100%;
        margin: 1rem 0;
        overflow: hidden;
      }
      
      th {
        font-weight: bold;
        text-align: left;
        background-color: rgba(0, 0, 0, 0.03);
      }
      
      td, th {
        border: 1px solid #e2e8f0;
        padding: 0.5rem;
        position: relative;
      }
      
      .dark td, .dark th {
        border-color: #334155;
      }
      
      .dark th {
        background-color: rgba(255, 255, 255, 0.05);
      }
      
      a {
        color: #6366F1;
        text-decoration: underline;
      }
      
      code {
        font-family: 'JetBrains Mono', monospace;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
        padding: 0.2rem 0.4rem;
        font-size: 0.9em;
      }
      
      .dark code {
        background-color: rgba(255, 255, 255, 0.05);
      }
    }
  }
`;

export default editorStyles;
