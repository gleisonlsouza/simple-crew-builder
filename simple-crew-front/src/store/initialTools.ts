import type { ToolConfig } from '../types/config.types';

export const initialGlobalTools: ToolConfig[] = [
    { id: 'serper', name: 'Google Search (Serper)', description: 'Search the web for real-time information.', isEnabled: false, requiresKey: true, category: 'Search', framework: 'crewai' },
    { id: 'tavily_search', name: 'Tavily Search', description: 'Advanced search optimized for LLMs and LangGraph.', isEnabled: false, requiresKey: true, category: 'Search', framework: 'langgraph' },
    { id: 'scrape', name: 'Website Scraper', description: 'Extract clean content from any website URL.', isEnabled: false, requiresKey: false, category: 'Web', framework: 'crewai' },
    { id: 'directory_read', name: 'Directory Read', description: 'List all files within a directory.', isEnabled: false, requiresKey: false, category: 'Files & Documents', framework: 'both' },
    { id: 'file_read', name: 'File Read', description: 'Read the content of a specific file.', isEnabled: false, requiresKey: false, category: 'Files & Documents', framework: 'both' },
    { id: 'file_write', name: 'File Write', description: 'Write content to a specific file.', isEnabled: false, requiresKey: false, category: 'Files & Documents', framework: 'both' },
    { id: 'directory_search', name: 'Directory Search', description: 'Search for files within a directory pattern.', isEnabled: false, requiresKey: false, category: 'Files & Documents', framework: 'both' },
    { 
      id: 'search_knowledge_base', 
      name: 'Knowledge Base Search (Neo4j RAG)', 
      description: 'Search for context and rules in the official corporate Knowledge Base.', 
      isEnabled: true, 
      requiresKey: false, 
      category: 'RAG / DATABASE',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { 
      id: 'pdf_search', 
      name: 'PDF Search', 
      description: 'RAG search through PDF documents.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Files & Documents',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { 
      id: 'docx_search', 
      name: 'Docx Search', 
      description: 'RAG search through Word documents.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Files & Documents',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { 
      id: 'json_search', 
      name: 'JSON Search', 
      description: 'RAG search through JSON files.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Files & Documents',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { 
      id: 'xml_search', 
      name: 'XML Search', 
      description: 'RAG search through XML files.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Files & Documents',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { 
      id: 'csv_search', 
      name: 'CSV Search', 
      description: 'RAG search through CSV files.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Files & Documents',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { 
      id: 'mdx_search', 
      name: 'MDX Search', 
      description: 'RAG search through MDX files.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Files & Documents',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { 
      id: 'txt_search', 
      name: 'TXT Search', 
      description: 'RAG search through TXT files.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Files & Documents',
      framework: 'crewai',
      user_config_schema: {
        fields: {
          knowledge_base_id: {
            type: 'select',
            label: 'Knowledge Base',
            placeholder: 'Select a Knowledge Base',
            required: true,
            optionsUrl: '/api/knowledge-bases'
          }
        }
      }
    },
    { id: 'ocr', name: 'OCR Tool', description: 'Extract text from images (local or URL).', isEnabled: false, requiresKey: false, category: 'Files & Documents', framework: 'crewai' },
    { 
      id: 'grep_search', 
      name: 'Grep Content Search', 
      description: 'Fast recursive search for exact text within workspace files.', 
      isEnabled: false, 
      requiresKey: false, 
      category: 'Search',
      framework: 'both'
    },
];
