

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Loader2, Copy, CheckCircle, Shield, Code, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tooltip from './Toolkit';
import Button from './Button';


const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [repoLink , setRepoLink] = useState(null);
  const chatEndRef = useRef(null);
  const [fileIndex, setFileIndex] = useState(0); // To track the current file being analyzed
  const [repoFiles, setRepoFiles] = useState([]); // Stores files from the GitHub repo
  const inputRef = useRef(null);
  console.log(repoFiles);

  const apiKey ="AIzaSyCa4ZuckRjGqLy_KiJl2dfm5n7i6Eqpiy4";
  
  // "AIzaSyDxxOvO3DmTqnGIeB8N3IX2vIOTiRZDMVg";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  








  const categorizeMessage = (message) => {
    const result = [];
    let insideCode = false;
    let currentText = '';

    const pushSimpleText = () => {
      if (currentText.trim()) {
        result.push({ type: 'simpletext', words: currentText.trim() });
        currentText = '';  // Reset
      }
    };

    const lines = message.split('\n');
    for (let line of lines) {
      line = line.trim(); // Clean up spaces

      // Handle code block
      if (line.startsWith('```')) {
        if (insideCode) {
          result.push({ type: 'codesnippet', words: currentText.trim() });
          currentText = '';
        }
        insideCode = !insideCode;
        continue;
      }

      if (insideCode) {
        currentText += `${line}\n`;
        continue;
      }

      // Handle headers and lists
      if (line.startsWith('**') && line.endsWith('**')) {
        pushSimpleText();
        result.push({ type: 'h3', words: line.replace(/\*\*/g, '').trim() });
      } else if (line.startsWith('*') && line.endsWith('*')) {
        pushSimpleText();
        result.push({ type: 'h2', words: line.replace(/\*/g, '').trim() });
      } else if (line.startsWith('-')) {
        pushSimpleText();
        result.push({ type: 'list', words: line.substring(1).trim() });
      } else {
        currentText += line + ' ';
      }
    }

    pushSimpleText();
    return result;
  };
  
  // Example usage
  
  // console.log(categorizeMessage(message));
  console.log(messages);
  

   

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (!inputRef.current || inputRef.current.value.trim() === "") {
        return;
      }

      handleSubmit(event); 
    }
  };


  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [input]);


  function isGitHubRepoLink(input) {
    const githubRepoRegex = /(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)?/;


    const match = input.match(githubRepoRegex);
    if (match) {
         setRepoLink( match[0]) };
    return githubRepoRegex.test(input);
  }


  const analyzeGitHubFile = async (fileName, fileContent) => {
    setMessages(prev => [...prev, { type: 'output', content: `File: ${fileName}\nFileContent:\n${fileContent}` }]);
    setFileIndex((prev) => prev + 1); // Move to the next file
  };


  const handleNextFile = async () => {
    if (fileIndex < repoFiles.length) {
      setLoading(true);
      const nextFile = repoFiles[fileIndex];
      await analyzeGitHubFile(nextFile.fileName, nextFile.fileContent);
      setLoading(false);
    }
  };

  const fetchGitHubRepo = async (repoLink) => {
    try {
      const response = await axios.post('http://localhost:3000/git/analyze', { repoLink });
      const files = response.data.fileswithContent;
      setRepoFiles(files);
      console.log("files recieved")
      await analyzeGitHubFile(files[0].fileName, files[0].fileContent);

    } catch (error) {
      setMessages(prev => [...prev, { type: 'output', content: 'Error analyzing the GitHub repository.' }]);
    } finally {
      setLoading(false);
    }
  };

  console.log(repoLink);


  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(input.trim());
    if (!input.trim()) return;

    if (isGitHubRepoLink(input)) {
        // GitHub Repo Analysis
        console.log('GitHub repository link detected. Starting repository analysis...');
        // await fetchGitHubRepo(input);
        console.log('GitHub repository analysis completed.');

        await fetchGitHubRepo(input);

     } else{
        console.log('No GitHub link detected. Starting regular code analysis...');

    // }
    // const language = detectLanguage(input);
    setMessages(prev => [...prev, { type: 'input', content: input }]);
    setInput('');
    setLoading(true);

    try {
      const prompt = `Analyze the following code, detect its language, identify potential vulnerabilities, and suggest fixes with a focus on cybersecurity:

      ${input}

      Please provide your response in the following format:
      Language: [detected language]
      Vulnerabilities:
      - [List of identified vulnerabilities]
      
      Suggested fixes:
      [Your suggested code fixes with explanations]

      Security Improvements:
      [Explain how the fixes improve security]`;
         
      console.log("partsssss");
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const output = response.data.candidates[0].content.parts[0].text;

      const newOutput = categorizeMessage(output);

      setMessages(prev => [...prev, { type: 'output', content: newOutput }]);
    } catch (error) {
      console.error('Error processing the code with Chatbot:', error);
      setMessages(prev => [...prev, { type: 'output', content: 'An error occurred while processing your request.' }]);
    } finally {
      setLoading(false);
      setInput("");
    }
}
  };

  const handleCopy = (index) => {
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen  bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r w-screen from-blue-600 to-blue-800 p-4 shadow-lg">
        <div className="container mx-auto items-center justify-between">
          <div className="flex items-center space-x-2 justify-center">
            <Shield className="h-8 w-8 " />
            <h1 className="text-2xl font-bold text-center">Cybersecurity Code Assistant</h1>
          </div>
          
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 p-4 border-r border-gray-700 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <MessageSquare className="mr-2" />
            Chat History
          </h2>
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-gray-400 text-sm"
              >
                Your past interactions will appear here.
              </motion.div>
            ) : (
              messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-2 py-2 pl-2 pr-4 bg-gray-700 rounded text-sm overflow-x-hidden "
                >
                  {/* <strong>{msg.type === 'input' ? 'You:' : 'Bot:'}</strong> {msg.content[0].substring(0, 0)}... */}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12"
                >
                  <Code className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                  <h2 className="text-2xl font-bold mb-2">Welcome to Cybersecurity Code Assistant</h2>
                  <p className="text-gray-400 mb-4">Start typing your code to get instant feedback!</p>
                </motion.div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-4 p-4 rounded-lg w-[60vw]  ${
                      message.type === 'input' ? 'bg-blue-900' : 'bg-gray-700'
                    } ${message.type==="input"? "" : "ml-[25%]"} `}
                  >
                    {message.type === 'input' && (
                      <div className="mb-2 bgp">
                        <strong>Your Input:</strong>
                        <SyntaxHighlighter language={message.language || "text"}  style={vscDarkPlus }>
                          {message.content}
                        </SyntaxHighlighter>
                        {/* <p className="text-sm  text-gray-400 mt-1">Detected language: {message.language}</p> */}
                      </div>
                    )}
                    {message.type === 'output' && (
                      
                      // <div>
                      //   <div className="mt-2 relative">
                      //     <SyntaxHighlighter language={message.language || 'javascript'}  style={vscDarkPlus }>
                      //       {message.content}
                      //     </SyntaxHighlighter >
                      //     <CopyToClipboard text={message.content} onCopy={() => handleCopy(index)}>
                      //       <button className="absolute top-2 right-2 p-1 bg-gray-600 rounded text-white hover:bg-gray-500 transition-colors">
                      //         {copied === index ? <CheckCircle size={18} /> : <Copy size={18} />}
                      //       </button>
                      //     </CopyToClipboard>
                      //   </div>
                      // </div>

    //                   <div>
    //                     

    //   {message.content.map((item, index) => {
    //     switch (item.type) {
    //       case 'h2':
    //         return (
    //           <h2 key={index} className="text-xl font-semibold my-2">
    //             {item.words}
    //           </h2>
    //         );
    //       case 'h3':
    //         return (
    //           <h3 key={index} className="text-lg font-bold my-1">
    //             {item.words}
    //           </h3>
    //         );
    //       case 'list':
    //         return (
    //           <li key={index} className="ml-4 list-disc">
    //             {item.words}
    //           </li>
    //         );
    //       case 'codesnippet':
    //         return (
    //           <div key={index} className="my-3 relative">
    //             <SyntaxHighlighter language="javascript" style={vscDarkPlus}>
    //               {item.words}
    //             </SyntaxHighlighter>
    //           </div>
    //         );
    //       default:
    //         return (
    //           <p key={index} className="text-white my-1">
    //             {item.words}
    //           </p>
    //         );
    //     }
    //   })}
    // </div>

    <div className="bg-gray-900 text-white p-4 rounded-lg">
      <strong >Chatbot Response:</strong>
      {message.content.map((item, index) => {
        if (item.type === 'codesnippet') {
          return (
            <div key={index} className="my-4">
              <SyntaxHighlighter language="javascript" style={vscDarkPlus}>
                {item.words}
              </SyntaxHighlighter>
            </div>
          );
        }

        if (item.type === 'h2') {
          return (
            <h2 key={index} className="text-2xl font-semibold my-4">
              {item.words}
            </h2>
          );
        }

        if (item.type === 'h3') {
          return (
            <h3 key={index} className="text-xl font-bold my-2">
              {item.words}
            </h3>
          );
        }

        if (item.type === 'list') {
          return (
            <li key={index} className="ml-4 list-disc my-2" >
              {item.words}
            </li>
          );
        }

        return (
          <p key={index} className="my-4">
            {item.words}
          </p>
        );
      })}
    </div>


                      
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center items-center"
              >
                <Loader2 className="animate-spin mr-2" size={24} />
                <span>Analyzing and fixing code...</span>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>



          <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700" >
  <Tooltip message="Paste your code here for analysis">
    <div className='flex '>
    <textarea
      value={input}
      ref={inputRef}
      onChange={(e) => setInput(e.target.value)}
      placeholder="// Paste your code here..."
      className="w-full relative p-2 bg-gray-700 pr-10 text-white border border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      rows={4}
       >  


      </textarea>
      <button
  type="submit"
  className="mt-2 absolute px-4 py-2 bottom-6 right-3 bg-blue-600 w-[4.5rem] h-[4.5rem] rounded-full text-white hover:bg-blue-700 transition-colors flex items-center justify-center"
  disabled={loading}
>
  {loading ? (
   <Loader2 className="animate-spin mr-2 justify-center items-center" size={30} />
  ) : (
    <svg
      xmlns="./Assets/arrow.svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className="w-6 h-6 -rotate-90"
    >
     
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )}
</button>

      </div>

  </Tooltip>
                </form>
                {repoFiles.length > 0 && fileIndex < repoFiles.length && (
              <button onClick={handleNextFile} className="mt-4 p-2 bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                Analyze Next File
              </button>
            )}
        </div>
      </div>
    </div>
  );
};






export default App;