import React, { useState, useEffect, useContext, createRef} from "react";
import { UserContext } from "../context/user.context.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../config/axios.js";
import Markdown from "markdown-to-jsx";
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

          // hljs won't reprocess the element unless this attribute is removed
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
        setMessages(prevMessages => [ ...prevMessages, data ]) // Update messages state
    } else {


        setMessages(prevMessages => [ ...prevMessages, data ]) // Update messages state
    }
    });
    axios
      .get(`/projects/get-project/${location.state.project._id}`)
      .then((res) => {
        console.log(res.data.project);

        setProject(res.data.project);
        //setFileTree(res.data.project.fileTree || {})
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

  const send =() => {
    console.log(message);
    sendMessage("message", {
      message,
      sender: user,
    });
    setMessages(prevMessages => [...prevMessages, {sender: user, message}])
    setMessage("");
  }

 function writeAiMessage(message){
  const messageObject = JSON.parse(message)
  return (
    <div className="overflow-auto bg-slate-950 text-white rounded-sm p-2">
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
 
  function scrollToBottom() {
    messageBox.current.scrollTop = messageBox.current.scrollHeight
}
  

  

  return (

   

    <main className="w-screen h-screen flex">
      <section className="left relative flex flex-col h-screen min-w-96 bg-slate-300">
        <header className="flex justify-between items-center w-full p-2 px-4 bg-slate-100 absolute z-10 top-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex gap-2"
          >
            <i className="ri-user-add-fill mr-1"></i>
            <p>Add Collaborator</p>
          </button>
          <button
            className="p-2"
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
          >
            <i className="ri-group-fill"></i>
          </button>
        </header>

        <div className="convo-area pt-14 pb-10 flex-grow flex flex-col h-full relative">
          <div 
          ref={messageBox}
          className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-hide">
           

           {messages.map((msg, index) => (
                            <div key={index} className={`${msg.sender._id === 'ai' ? 'max-w-80' : 'max-w-52'} ${msg.sender._id == user._id.toString() && 'ml-auto'}  message flex flex-col p-2 bg-slate-50 w-fit rounded-md`}>
                                <small className='opacity-65 text-xs'>{msg.sender.email}</small>
                                <div className='text-sm'>
                                    {msg.sender._id === 'ai' ?
                                    
                                      writeAiMessage(msg.message)
                                     
                                    
                                        
                                        : <p>{msg.message}</p>}
                                </div>
                            </div>
                        ))}
          </div>
          <div className="input-message flex w-full absolute bottom-0">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="p-2 px-4 border-none outline-none flex-grow"
              type="text"
              placeholder="Message"
            />
            <button onClick={send} className="flex-grow px-3">
              <i className="ri-send-plane-2-fill"></i>
            </button>
          </div>
        </div>

        <div
          className={`side-panel w-full h-full bg-slate-100 top-0 transition-all absolute  ${
            isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <header className="flex justify-between p-2 px-3 bg-slate-100">
            <h1 className="p-2">Collaborators</h1>
            <button
              className="p-2"
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            >
              <i className="ri-close-fill"></i>
            </button>
          </header>

          {project.users &&
            project.users.map((user) => {
              return (
                <div className="users flex flex-col p-3">
                  <div className="user flex gap-2 items-center p-2 hover:bg-slate-50">
                    <div className="aspect-square text-white  rounded-full w-fit h-fit flex items-center justify-center p-5 bg-slate-800">
                      <i className="ri-user-fill absolute"></i>
                    </div>
                    <h1 className="font-semibold text-lg">{user.email}</h1>
                  </div>
                </div>
              );
            })}
        </div>
      </section>
      <section className="right  bg-red-50 flex-grow h-full flex">

<div className="explorer h-full max-w-64 min-w-52 bg-slate-200">
    <div className="file-tree w-full">
        {
            Object.keys(fileTree).map((file, index) => (
                <button
                    key={index}
                    onClick={() => {
                        setCurrentFile(file)
                        setOpenFiles([ ...new Set([ ...openFiles, file ]) ])
                    }}
                    className="tree-element cursor-pointer p-2 px-4 flex items-center gap-2 bg-slate-300 w-full">
                    <p
                        className='font-semibold text-lg'
                    >{file}</p>
                </button>))

        }
    </div>

</div>


<div className="code-editor flex flex-col flex-grow h-full shrink">

    <div className="top flex justify-between w-full">

        <div className="files flex">
            {
                openFiles.map((file, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentFile(file)}
                        className={`open-file cursor-pointer p-2 px-4 flex items-center w-fit gap-2 bg-slate-300 ${currentFile === file ? 'bg-slate-400' : ''}`}>
                        <p
                            className='font-semibold text-lg'
                        >{file}</p>
                    </button>
                ))
            }
        </div>

        <div className="actions flex gap-2">
            <button
                onClick={async () => {
                    await webContainer.mount(fileTree)


                    const installProcess = await webContainer.spawn("npm", [ "install" ])



                    installProcess.output.pipeTo(new WritableStream({
                        write(chunk) {
                            console.log(chunk)
                        }
                    }))

                    if (runProcess) {
                        runProcess.kill()
                    }

                    let tempRunProcess = await webContainer.spawn("npm", [ "start" ]);

                    tempRunProcess.output.pipeTo(new WritableStream({
                        write(chunk) {
                            console.log(chunk)
                        }
                    }))

                    setRunProcess(tempRunProcess)

                    webContainer.on('server-ready', (port, url) => {
                        console.log(port, url)
                        setIframeUrl(url)
                    })

                }}
                className='p-2 px-4 bg-slate-300 text-white'
            >
                run
            </button>


        </div>
    </div>
    <div className="bottom flex flex-grow max-w-full shrink overflow-auto">
        {
            fileTree[ currentFile ] && (
                <div className="code-editor-area h-full overflow-auto flex-grow bg-slate-50">
                    <pre
                        className="hljs h-full">
                        <code
                            className="hljs h-full outline-none"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                                const updatedContent = e.target.innerText;
                                const ft = {
                                    ...fileTree,
                                    [ currentFile ]: {
                                        file: {
                                            contents: updatedContent
                                        }
                                    }
                                }
                                setFileTree(ft)
                                saveFileTree(ft)
                            }}
                            dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[ currentFile ].file.contents).value }}
                            style={{
                                whiteSpace: 'pre-wrap',
                                paddingBottom: '25rem',
                                counterSet: 'line-numbering',
                            }}
                        />
                    </pre>
                </div>
            )
        }
    </div>

</div>

{iframeUrl && webContainer &&
    (<div className="flex min-w-96 flex-col h-full">
        <div className="address-bar">
            <input type="text"
                onChange={(e) => setIframeUrl(e.target.value)}
                value={iframeUrl} className="w-full p-2 px-4 bg-slate-200" />
        </div>
        <iframe src={iframeUrl} className="w-full h-full"></iframe>
    </div>)
}


</section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md w-96 max-w-full relative">
            <header className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select User</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2">
                <i className="ri-close-fill"></i>
              </button>
            </header>
            <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`user cursor-pointer hover:bg-slate-200 ${
                    Array.from(selectedUserId).indexOf(user._id) != -1
                      ? "bg-slate-200"
                      : ""
                  } p-2 flex gap-2 items-center`}
                  onClick={() => handleUserClick(user._id)}
                >
                  <div className="aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600">
                    <i className="ri-user-fill absolute"></i>
                  </div>
                  <h1 className="font-semibold text-lg">{user.email}</h1>
                </div>
              ))}
            </div>
            <button
              onClick={addCollaborators}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Add Collaborators
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Project;
