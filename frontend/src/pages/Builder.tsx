import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { Loader } from '../components/Loader';
import { CodeEditor } from '../components/CodeEditor';
import { useWebContainer } from '../hooks/useWebContainers';
import { PreviewFrame } from '../components/PreviewFrame';

const MOCK_FILE_CONTENT = `// This is a sample file content
import React from 'react';

function Component() {
  return <div>Hello World</div>;
}

export default Component;`

export function Builder() {
  const location = useLocation()
  const { prompt } = location.state as { prompt: string }
  const [userPrompt, setPrompt] = useState("")
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([])
  const [loading, setLoading] = useState(false)
  const [templateSet, setTemplateSet] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  
  const [steps, setSteps] = useState<Step[]>([])

  const [files, setFiles] = useState<FileItem[]>([])

  const webcontainer = useWebContainer()


  // useEffect(() => {
  //   console.log('Selected file:', selectedFile);
  // }, [selectedFile])

  
  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
        let currentFileStructure = [...originalFiles]; // {}

        let finalAnswerRef = currentFileStructure;
        
        // console.log('finalanserref' , finalAnswerRef)
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          // console.log('before' , parsedPath)

          parsedPath = parsedPath.slice(1);

          // console.log('after' , parsedPath)
  
          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
        // console.log('afeter orginal fiels' , originalFiles)
      }

    })

    if (updateHappened) {

      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => {
        return {
          ...s,
          status: "completed"
        }
        
      }))
    }
    // console.log('last files console' , files);
  }, [steps, files]);

// webhooks mount 
useEffect(() => {
  const createMountStructure = (files: FileItem[]): Record<string, any> => {
    const mountStructure: Record<string, any> = {};

    const processFile = (file: FileItem, isRootFolder: boolean) => {  
      if (file.type === 'folder') {
        mountStructure[file.name] = {
          directory: file.children ? 
            Object.fromEntries(
              file.children.map(child => [child.name, processFile(child, false)])
            ) 
            : {}
        };
      } else if (file.type === 'file') {
        if (isRootFolder) {
          mountStructure[file.name] = {
            file: {
              contents: file.content || ''
            }
          };
        } else {
          return {
            file: {
              contents: file.content || ''
            }
          };
        }
      }

      return mountStructure[file.name];
    };
    files.forEach(file => processFile(file, true));

    return mountStructure;
  }

  const mountStructure = createMountStructure(files);

  // Mount the structure if WebContainer is available
  console.log('mountstrucure',mountStructure);
  webcontainer?.mount(mountStructure);
}, [files, webcontainer]);
  
  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);

    const {prompts, uiPrompts} = response.data;

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({ // parsed templates mapping for steps in sidebar
      ...x,
      status: "pending"
    })));

    // returns me the response from the LLM
    // const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
    //   messages: [...prompts, prompt].map(content => ({
    //     role: "user",
    //     content
    //   }))
    // });
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, `follow the same boltArtifact format as demonstrated in previous examples and always close all the tags at the end of each response. Now create a complete response for this prompt: ${prompt}`].map(content => ({
        role: "user",
        content
      }))
    });
    
    console.log('stepsResponse', stepsResponse.data.response);
    
    const parsedSteps = parseXml(stepsResponse.data.response);
    console.log('parsedSteps', parsedSteps);
    
    // Update state properly with new steps
    setSteps((prevSteps) => {
      console.log('prevSteps:', prevSteps);
      const newSteps = [
        ...prevSteps,
        ...parsedSteps.map((x: Step) => ({
          ...x,
          status: "pending" as "pending",
        })),
      ];
      console.log('newSteps:', newSteps);
      return newSteps;
    });
    
    

  }


  useEffect(() => {
    init();
  }, [])



  

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">🚀 Website Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Prompt: <span className="text-purple-300">{prompt}</span></p>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div>
            <h2 className="text-lg font-semibold text-gray-200">📋 Steps</h2>
            <div className="max-h-[65vh] overflow-auto">
              <StepsList
                steps={steps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </div>
              <div>
                <div className='flex'>
                  <br />
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && <div className='flex'>
                    <textarea value={userPrompt} onChange={(e) => {
                    setPrompt(e.target.value)
                  }} className='p-2 w-full'></textarea>
                  <button onClick={async () => {
                    const newMessage = {
                      role: "user" as "user",
                      content: `follow the same boltArtifact format as demonstrated in previous examples and always close all the tags at the end of each response.now continue the response with this ${userPrompt}`
                    };

                    setLoading(true);
                    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                      messages: [...llmMessages, newMessage]
                    });
                    setLoading(false);
                    
                    setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
                      ...x,
                      status: "pending" as "pending"
                    }))]);

                  }} className='bg-purple-400 px-4'>Send</button>
                  </div>}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1">
              <FileExplorer 
                files={files} 
                onFileSelect={setSelectedFile}
              />
            </div>
          <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : (
                <PreviewFrame webContainer={webcontainer} files={selectedFile} />
              )}
            </div> 
          </div>
        </div>
      </div>
    </div>
  );
}