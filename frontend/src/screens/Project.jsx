import React, { useState, useEffect, useContext, createRef, useRef} from "react";
import { UserContext } from "../context/user.context.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../config/axios.js";
import Markdown from "markdown-to-jsx";
import { getWebContainer } from '../config/webcontainer.js'
import hljs from 'highlight.js';
import {
  InitializeSocket,
  recieveMessage,
  sendMessage,
} from "../config/socket.js";

function SyntaxHighlightedCode(props) {
  const ref = useRef(null)

  useEffect(() => {
      if (ref.current && props.className?.includes('lang-') && window.hljs) {
          window.hljs.highlightElement(ref.current)
          ref.current.removeAttribute('data-highlighted')
      }
  }, [ props.className, props.children ])

  return <code {...props} ref={ref} />
}

const Project = () => {
  const location = useLocation();
  const [project, setProject] = useState(location.state.project);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [message, setMessage] = useState('');
  const { user } = useContext(UserContext);
  const messageBox = createRef();
  const [messages, setMessages] = useState([])
  const [fileTree, setFileTree] = useState({})
  const [ currentFile, setCurrentFile ] = useState(null)
  const [ openFiles, setOpenFiles ] = useState([])
  const [ webContainer, setWebContainer ] = useState(null)
  const [ iframeUrl, setIframeUrl ] = useState(null)
  const [ runProcess, setRunProcess ] = useState(null)
  const [isRunning, setIsRunning] = useState(false);

  console.log(location.state);

  useEffect(() => {
    InitializeSocket(project._id);

    recieveMessage("message", (data) => {
      if (data.sender._id == 'ai') {
        const message = JSON.parse(data.message)
        console.log(message)
        webContainer?.mount(message.fileTree)
        if (message.fileTree) {
            setFileTree(message.fileTree || {})
        }
        setMessages(prevMessages => [ ...prevMessages, data ])
      } else {
        setMessages(prevMessages => [ ...prevMessages, data ])
      }
    });

    // Initialize WebContainer
    getWebContainer().then(container => {
      setWebContainer(container);
    });

    axios
      .get(`/projects/get-project/${location.state.project._id}`)
      .then((res) => {
        console.log(res.data.project);
        setProject(res.data.project);
        setFileTree(res.data.project.fileTree || {})
      });

    axios
      .get("/users/all")
      .then((res) => {
        setUsers(res.data.users);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = () => {
    if (message.trim()) {
      console.log(message);
      sendMessage("message", {
        message,
        sender: user,
      });
      setMessages(prevMessages => [...prevMessages, {sender: user, message}])
      setMessage("");
    }
  }

  function writeAiMessage(message){
    const messageObject = JSON.parse(message)
    return (
      <div className="overflow-auto bg-gradient-to-br from-slate-900 to-slate-800 text-emerald-400 rounded-lg p-3 shadow-lg border border-slate-700">
          <Markdown children = {messageObject.text}
          options = {{
            overrides:{
              code: SyntaxHighlightedCode,
            },
          }} />
      </div>
    )
  }

  function addCollaborators() {
    axios
      .put("/projects/add-user", {
        projectId: location.state.project._id,
        users: Array.from(selectedUserId),
      })
      .then((res) => {
        console.log(res.data);
        setIsModalOpen(false);
        setSelectedUserId(new Set());
        // Refresh project data
        return axios.get(`/projects/get-project/${location.state.project._id}`);
      })
      .then((res) => {
        setProject(res.data.project);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const handleUserClick = (id) => {
    setSelectedUserId((prevSelectedUserId) => {
      const newSelectedUserId = new Set(prevSelectedUserId);
      if (newSelectedUserId.has(id)) {
        newSelectedUserId.delete(id);
      } else {
        newSelectedUserId.add(id);
      }
      return newSelectedUserId;
    });
  };

  function saveFileTree(ft) {
      axios.put('/projects/update-file-tree', {
          projectId: project._id,
          fileTree: ft
      }).then(res => {
          console.log(res.data)
      }).catch(err => {
          console.log(err)
      })
  }

  function scrollToBottom() {
    if (messageBox.current) {
      messageBox.current.scrollTop = messageBox.current.scrollHeight
    }
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx': return 'ri-javascript-fill text-yellow-500';
      case 'html': return 'ri-html5-fill text-orange-500';
      case 'css': return 'ri-css3-fill text-blue-500';
      case 'json': return 'ri-file-code-fill text-green-500';
      case 'md': return 'ri-markdown-fill text-purple-500';
      case 'py': return 'ri-file-code-fill text-blue-400';
      case 'ts':
      case 'tsx': return 'ri-file-code-fill text-blue-600';
      default: return 'ri-file-fill text-gray-500';
    }
  };

  const runProject = async () => {
    if (!webContainer) return;
    
    setIsRunning(true);
    try {
      await webContainer.mount(fileTree);
      
      const installProcess = await webContainer.spawn("npm", ["install"]);
      
      installProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          console.log(chunk);
        }
      }));

      if (runProcess) {
        runProcess.kill();
      }

      let tempRunProcess = await webContainer.spawn("npm", ["start"]);

      tempRunProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          console.log(chunk);
        }
      }));

      setRunProcess(tempRunProcess);

      webContainer.on('server-ready', (port, url) => {
        console.log(port, url);
        setIframeUrl(url);
        setIsRunning(false);
      });
    } catch (error) {
      console.error('Error running project:', error);
      setIsRunning(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Custom Styles */}
      <style jsx>{`
        .message-animate {
          animation: slideInUp 0.3s ease-out;
        }
        
        .fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        
        .scale-in {
          animation: scaleIn 0.2s ease-out;
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: rgb(148 163 184) transparent;
        }
        
        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background-color: rgb(148 163 184);
          border-radius: 3px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background-color: rgb(100 116 139);
        }
        
        .pulse-ring {
          animation: pulseRing 2s infinite;
        }
        
        @keyframes pulseRing {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>

      <main className="w-screen h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
        {/* Left Panel - Chat Section */}
        <section className="left relative flex flex-col h-screen w-full lg:min-w-96 lg:max-w-md bg-gradient-to-b from-white via-slate-50 to-indigo-50 shadow-2xl border-r border-indigo-200/50">
          {/* Header */}
          <header className="flex justify-between items-center w-full p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg z-20 backdrop-blur-sm">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-md shadow-lg border border-white/20"
            >
              <i className="ri-user-add-fill text-lg"></i>
              <span className="hidden sm:inline font-medium">Add Collaborator</span>
            </button>
            <button
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110 backdrop-blur-md"
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            >
              <i className="ri-group-fill text-xl"></i>
            </button>
          </header>

          {/* Chat Area */}
          <div className="convo-area flex-grow flex flex-col h-full relative overflow-hidden">
            <div 
              ref={messageBox}
              className="message-box p-4 flex-grow flex flex-col gap-3 overflow-auto scrollbar-custom"
            >
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message-animate ${
                    msg.sender._id === 'ai' 
                      ? 'max-w-xs lg:max-w-sm' 
                      : 'max-w-xs'
                  } ${
                    msg.sender._id == user._id.toString() && 'ml-auto'
                  } message flex flex-col p-4 ${
                    msg.sender._id === 'ai'
                      ? 'bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 border-2 border-emerald-200/50 shadow-lg'
                      : msg.sender._id == user._id.toString()
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200/50 shadow-md'
                  } w-fit rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]`}
                >
                  <small className={`text-xs font-semibold mb-2 ${
                    msg.sender._id == user._id.toString() ? 'text-white/90' : 'text-slate-600'
                  }`}>
                    {msg.sender.email || msg.sender.name}
                  </small>
                  <div className="text-sm leading-relaxed">
                    {msg.sender._id === 'ai' 
                      ? writeAiMessage(msg.message)
                      : <p className="whitespace-pre-wrap">{msg.message}</p>
                    }
                  </div>
                </div>
              ))}
            </div>
            
            {/* Message Input */}
            <div className="input-message flex w-full p-4 bg-gradient-to-r from-white/90 via-slate-50/90 to-indigo-50/90 backdrop-blur-md border-t border-indigo-200/50">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="p-4 px-6 border-2 border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none flex-grow rounded-l-2xl bg-white/95 placeholder-slate-400 transition-all duration-300 focus:shadow-lg text-sm"
                type="text"
                placeholder="Type your message... (Enter to send)"
              />
              <button 
                onClick={send} 
                disabled={!message.trim()}
                className="px-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-r-2xl transition-all duration-300 hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <i className="ri-send-plane-2-fill text-lg"></i>
              </button>
            </div>
          </div>

          {/* Side Panel - Collaborators */}
          <div
            className={`side-panel w-full h-full bg-gradient-to-b from-white via-slate-50 to-slate-100 top-0 transition-transform duration-500 absolute z-30 shadow-2xl ${
              isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <header className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 text-white shadow-lg">
              <h1 className="text-lg font-bold">Collaborators</h1>
              <button
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              >
                <i className="ri-close-fill text-xl"></i>
              </button>
            </header>

            <div className="users-list p-4 space-y-3">
              {project.users &&
                project.users.map((projectUser, index) => (
                  <div key={index} className="user flex gap-3 items-center p-4 hover:bg-gradient-to-r hover:from-slate-100 hover:to-indigo-50 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-md border border-transparent hover:border-indigo-200">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                        <i className="ri-user-fill text-lg"></i>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm">
                        <div className="absolute inset-0 bg-green-400 rounded-full pulse-ring"></div>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h1 className="font-semibold text-slate-800">{projectUser.email}</h1>
                      <p className="text-xs text-slate-500 mt-1">Online</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* Right Panel - Code Editor */}
        <section className="right bg-gradient-to-br from-slate-50 via-white to-blue-50 flex-grow h-full flex overflow-hidden">
          {/* File Explorer */}
          <div className="explorer h-full w-full sm:max-w-64 sm:min-w-52 bg-gradient-to-b from-slate-100 via-slate-150 to-slate-200 border-r border-slate-300 shadow-lg hidden sm:block">
            <div className="file-tree w-full">
              <div className="p-4 bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 text-white font-bold text-sm shadow-lg">
                <i className="ri-folder-open-fill mr-2 text-yellow-400"></i>
                Project Files
              </div>
              {Object.keys(fileTree).map((file, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentFile(file);
                    setOpenFiles([...new Set([...openFiles, file])]);
                  }}
                  className={`tree-element cursor-pointer p-4 px-6 flex items-center gap-3 hover:bg-gradient-to-r hover:from-slate-200 hover:to-indigo-100 w-full text-left transition-all duration-300 border-b border-slate-200/50 hover:shadow-sm transform hover:scale-[1.01] ${
                    currentFile === file ? 'bg-gradient-to-r from-indigo-100 to-purple-100 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <i className={`${getFileIcon(file)} text-lg`}></i>
                  <p className="font-medium text-sm text-slate-700 truncate">{file}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Code Editor */}
          <div className="code-editor flex flex-col flex-grow h-full min-w-0">
            {/* Tabs and Actions */}
            <div className="top flex justify-between w-full bg-gradient-to-r from-slate-200 via-slate-250 to-slate-300 border-b border-slate-400 shadow-sm">
              <div className="files flex overflow-x-auto scrollbar-custom">
                {openFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFile(file)}
                    className={`open-file cursor-pointer p-4 px-6 flex items-center gap-3 transition-all duration-300 border-r border-slate-300 hover:bg-white/70 min-w-0 ${
                      currentFile === file 
                        ? 'bg-white text-indigo-600 shadow-md border-b-2 border-indigo-500' 
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <i className={`${getFileIcon(file)} text-sm flex-shrink-0`}></i>
                    <p className="font-medium text-sm whitespace-nowrap truncate max-w-32">{file}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newOpenFiles = openFiles.filter(f => f !== file);
                        setOpenFiles(newOpenFiles);
                        if (currentFile === file && newOpenFiles.length > 0) {
                          setCurrentFile(newOpenFiles[0]);
                        } else if (newOpenFiles.length === 0) {
                          setCurrentFile(null);
                        }
                      }}
                      className="ml-2 hover:bg-slate-200 rounded-full p-1 transition-colors duration-200 flex-shrink-0"
                    >
                      <i className="ri-close-line text-xs"></i>
                    </button>
                  </button>
                ))}
              </div>

              <div className="actions flex gap-3 p-3">
                <button
                  onClick={runProject}
                  disabled={isRunning || !webContainer}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg font-semibold text-sm disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Running...
                    </>
                  ) : (
                    <>
                      <i className="ri-play-fill"></i>
                      Run Project
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Editor Area */}
            <div className="bottom flex flex-grow overflow-hidden">
              {fileTree[currentFile] ? (
                <div className="code-editor-area h-full flex-grow bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-green-400 font-mono text-sm overflow-auto scrollbar-custom relative">
                  <div className="absolute top-4 right-4 text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-lg backdrop-blur-sm border border-slate-700">
                    {currentFile}
                  </div>
                  <pre className="h-full p-6 pt-12">
                    <code
                      className="h-full outline-none block"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const updatedContent = e.target.innerText;
                        const ft = {
                          ...fileTree,
                          [currentFile]: {
                            file: {
                              contents: updatedContent
                            }
                          }
                        }
                        setFileTree(ft);
                        saveFileTree(ft);
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: hljs.highlight('javascript', fileTree[currentFile].file.contents).value 
                      }}
                      style={{
                        whiteSpace: 'pre-wrap',
                        paddingBottom: '25rem',
                        lineHeight: '1.6',
                      }}
                    />
                  </pre>
                </div>
              ) : (
                <div className="flex-grow bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <div className="text-center text-slate-500 p-8">
                    <i className="ri-file-code-line text-6xl mb-4 text-slate-400"></i>
                    <h3 className="text-lg font-semibold mb-2">No File Selected</h3>
                    <p className="text-sm">Choose a file from the explorer to start editing</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          {iframeUrl && webContainer && (
            <div className="preview-panel flex min-w-0 sm:min-w-96 flex-col h-full border-l border-slate-300 bg-white shadow-xl">
              <div className="address-bar bg-gradient-to-r from-slate-100 via-slate-150 to-slate-200 p-3 border-b border-slate-300 shadow-sm">
                <div className="flex items-center gap-3">
                  <i className="ri-global-line text-slate-500 text-lg"></i>
                  <input 
                    type="text"
                    onChange={(e) => setIframeUrl(e.target.value)}
                    value={iframeUrl} 
                    className="flex-grow p-3 px-4 bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm outline-none transition-all duration-300 focus:shadow-md" 
                    placeholder="Enter URL..."
                  />
                  <button 
                    onClick={() => {
                      const iframe = document.querySelector('.preview-panel iframe');
                      if (iframe) iframe.src = iframe.src;
                    }}
                    className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-md"
                  >
                    <i className="ri-refresh-line"></i>
                  </button>
                </div>
              </div>
              <iframe 
                src={iframeUrl} 
                className="w-full h-full bg-white"
                title="Project Preview"
              />
            </div>
          )}
        </section>

        {/* Modal - Add Collaborators */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in">
            <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl transform scale-in border border-slate-200">
              <header className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Add Collaborators
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedUserId(new Set());
                  }} 
                  className="p-3 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-500 hover:text-slate-700"
                >
                  <i className="ri-close-fill text-xl"></i>
                </button>
              </header>
              
              <div className="users-list flex flex-col gap-3 mb-8 max-h-80 overflow-auto scrollbar-custom">
                {users.map((availableUser) => (
                  <div
                    key={availableUser._id}
                    className={`user cursor-pointer hover:bg-slate-50 rounded-2xl transition-all duration-300 p-4 flex gap-4 items-center transform hover:scale-[1.02] border-2 ${
                      Array.from(selectedUserId).indexOf(availableUser._id) !== -1
                        ? "bg-gradient-to-r from-indigo-100 via-purple-50 to-pink-100 border-indigo-300 shadow-md"
                        : "border-transparent hover:border-slate-200 hover:shadow-sm"
                    }`}
                    onClick={() => handleUserClick(availableUser._id)}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <i className="ri-user-fill text-lg"></i>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h1 className="font-semibold text-slate-800 truncate">{availableUser.email}</h1>
                      <p className="text-sm text-slate-500">Click to select</p>
                    </div>
                    {Array.from(selectedUserId).indexOf(availableUser._id) !== -1 && (
                      <i className="ri-check-line text-indigo-600 text-xl flex-shrink-0"></i>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={addCollaborators}
                disabled={selectedUserId.size === 0}
                className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] disabled:cursor-not-allowed shadow-lg disabled:hover:scale-100"
              >
                Add {selectedUserId.size} Collaborator{selectedUserId.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Project;
