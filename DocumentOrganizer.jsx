import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder, Plus, Trash2, Edit2, X, AlertTriangle, Loader2, Save, LogIn, FileText, Lock, Sun, Moon, Upload, Download
} from 'lucide-react';

// --- Local Storage Constants ---
const DOCUMENTS_STORAGE_KEY = 'secureDatabankDocuments';
const SETTINGS_STORAGE_KEY = 'secureDatabankSettings';
const THEME_STORAGE_KEY = 'documentOrganizerTheme';
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB limit for safety

// --- Utility Functions ---

/**
 * Hashes the input password using SHA-256.
 * @param {string} password The password string to hash.
 * @returns {Promise<string>} The hex-encoded SHA-256 hash.
 */
const hashPassword = async (password) => {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// --- Local Storage Handler ---

const getInitialUserId = () => {
    let id = localStorage.getItem('secureDatabankUserId');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('secureDatabankUserId', id);
    }
    return id;
};

const getLocalData = (key, defaultValue) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error("Error reading localStorage key:", key, e);
        return defaultValue;
    }
};

const setLocalData = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("Error writing localStorage key:", key, e);
    }
};

// --- Theme Context and Provider ---
const ThemeContext = React.createContext();

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme || 'dark'; // Default to dark mode
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => React.useContext(ThemeContext);

// --- Tailwind CSS Classes for Neon Theme ---
const neon = {
  // Base
  'bg-base-dark': 'bg-gradient-to-br from-gray-950 to-indigo-950',
  'text-base-dark': 'text-gray-100',
  'border-base-dark': 'border-indigo-800',

  'bg-base-light': 'bg-gradient-to-br from-indigo-50 to-purple-50',
  'text-base-light': 'text-gray-800',
  'border-base-light': 'border-indigo-200',

  // Cards/Containers
  'bg-card-dark': 'bg-gray-900 border border-purple-800 shadow-neon-purple',
  'text-card-dark': 'text-indigo-200',
  'bg-card-light': 'bg-white border border-indigo-200 shadow-neon-blue-light',
  'text-card-light': 'text-gray-700',

  // Headings
  'text-heading-dark': 'text-purple-400 drop-shadow-neon-purple',
  'text-heading-light': 'text-indigo-700 drop-shadow-neon-blue-light',

  // Inputs
  'input-dark': 'bg-gray-800 border-purple-700 text-purple-200 focus:border-blue-500 focus:ring-blue-500 shadow-inner-neon-purple',
  'input-light': 'bg-white border-indigo-300 text-gray-800 focus:border-purple-500 focus:ring-purple-500 shadow-inner-neon-blue-light',

  // Buttons
  'btn-primary-dark': 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-neon-blue-lg active:shadow-none',
  'btn-secondary-dark': 'bg-gray-700 border-purple-600 text-purple-200 hover:bg-gray-600 shadow-neon-purple-sm active:shadow-none',
  'btn-danger-dark': 'bg-red-700 hover:bg-red-800 text-white shadow-neon-red-sm active:shadow-none',

  'btn-primary-light': 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-neon-blue-light-lg active:shadow-none',
  'btn-secondary-light': 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200 shadow-neon-blue-light-sm active:shadow-none',
  'btn-danger-light': 'bg-red-500 hover:bg-red-600 text-white shadow-neon-red-light-sm active:shadow-none',

  // Icons
  'icon-dark': 'text-blue-400 drop-shadow-neon-blue',
  'icon-light': 'text-purple-600',

  // Tags
  'tag-dark': 'bg-blue-800 text-blue-200 shadow-neon-blue-sm',
  'tag-light': 'bg-purple-100 text-purple-800',

  // Messages
  'msg-success-dark': 'bg-green-900 text-green-300 border-green-700 shadow-neon-green-sm',
  'msg-error-dark': 'bg-red-900 text-red-300 border-red-700 shadow-neon-red-sm',
  'msg-warning-dark': 'bg-yellow-900 text-yellow-300 border-yellow-700 shadow-neon-yellow-sm',

  'msg-success-light': 'bg-green-100 text-green-800 border-green-300',
  'msg-error-light': 'bg-red-100 text-red-800 border-red-300',
  'msg-warning-light': 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const getThemedClasses = (key, currentTheme) => {
    return neon[`${key}-${currentTheme}`] || '';
};

// --- Security Components ---

const PasswordFormBase = ({ title, buttonText, onSubmit, error, children }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { theme } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            onSubmit(null, "Password must be at least 6 characters long.");
            return;
        }
        setIsLoading(true);
        await onSubmit(password);
        setIsLoading(false);
    };

    const cardClass = getThemedClasses('bg-card', theme);
    const textClass = getThemedClasses('text-card', theme);
    const headingClass = getThemedClasses('text-heading', theme);
    const inputClass = getThemedClasses('input', theme);
    const buttonClass = getThemedClasses('btn-primary', theme);
    const errorClass = getThemedClasses('msg-error', theme);
    const iconClass = getThemedClasses('icon', theme);

    return (
        <div className={`max-w-md w-full p-8 rounded-xl ${cardClass} font-mono`}>
            <div className="text-center mb-6">
                <Lock className={`w-12 h-12 mx-auto mb-3 ${iconClass}`} />
                <h2 className={`text-4xl font-bold mb-2 ${headingClass}`}>{title}</h2>
                <p className={`text-sm ${textClass}`}>{children}</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 transition duration-150 ${inputClass}`}
                        placeholder="Enter Master Password"
                        required
                    />
                </div>

                {error && (
                    <div className={`p-3 mb-4 text-sm rounded-lg flex items-center ${errorClass}`}>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className={`w-full py-3 font-semibold rounded-lg transition duration-150 flex items-center justify-center disabled:opacity-50 ${buttonClass}`}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {buttonText}
                </button>
            </form>
        </div>
    );
};

const PasswordSetup = ({ onAuthenticated }) => {
    const [localError, setLocalError] = useState(null);

    const handleSetup = async (password, validationError) => {
        if (validationError) {
            setLocalError(validationError);
            return;
        }
        setLocalError(null);

        try {
            const hashedPassword = await hashPassword(password);
            
            const settings = getLocalData(SETTINGS_STORAGE_KEY, {});
            settings.passwordHash = hashedPassword;
            setLocalData(SETTINGS_STORAGE_KEY, settings);

            console.log("Password set successfully in localStorage.");
            onAuthenticated(hashedPassword);
        } catch (e) {
            console.error("Error setting password:", e);
            setLocalError("Failed to set password. Please try again.");
        }
    };

    return (
        <PasswordFormBase
            title="SECURE DATABANK"
            buttonText="SET ACCESS CODE"
            onSubmit={handleSetup}
            error={localError}
        >
            This password will be required every time you open the app. Choose wisely, data runner.
        </PasswordFormBase>
    );
};

const PasswordGate = ({ storedHash, onAuthenticated }) => {
    const [localError, setLocalError] = useState(null);

    const handleLogin = async (password, validationError) => {
        if (validationError) {
            setLocalError(validationError);
            return;
        }
        setLocalError(null);

        const enteredHash = await hashPassword(password);

        if (enteredHash === storedHash) {
            onAuthenticated(storedHash);
        } else {
            setLocalError("ACCESS DENIED. INCORRECT PROTOCOL.");
        }
    };

    return (
        <PasswordFormBase
            title="ACCESS DATABANK"
            buttonText="DECRYPT"
            onSubmit={handleLogin}
            error={localError}
        >
            Enter your master password to access your private documents.
        </PasswordFormBase>
    );
};

// --- Confirmation Modal ---

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    const { theme } = useTheme();
    const cardClass = getThemedClasses('bg-card', theme);
    const headingClass = getThemedClasses('text-heading', theme);
    const textClass = getThemedClasses('text-card', theme);
    const btnDangerClass = getThemedClasses('btn-danger', theme);
    const btnSecondaryClass = getThemedClasses('btn-secondary', theme);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className={`rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${cardClass}`}>
                <div className={`p-6 border-b border-purple-700`}>
                    <h2 className={`text-2xl font-bold flex items-center ${headingClass}`}>
                        <AlertTriangle className="w-6 h-6 mr-2 text-red-500 drop-shadow-neon-red-sm" />
                        {title}
                    </h2>
                </div>
                <div className={`p-6 ${textClass}`}>
                    <p className="mb-6">{message}</p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onCancel}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition duration-150 ${btnSecondaryClass}`}
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition duration-150 ${btnDangerClass}`}
                        >
                            <Trash2 className="w-4 h-4 mr-1 inline" />
                            ERADICATE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Document CRUD and UI Components ---

const DocumentForm = ({ currentDocument, onSave, onCancel, setError }) => {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState(currentDocument ? currentDocument.title : '');
  const [content, setContent] = useState(currentDocument ? currentDocument.content : '');
  const [tags, setTags] = useState(currentDocument ? currentDocument.tags.join(', ') : '');
  
  // State for file data (Base64 data URL is stored in localStorage)
  const [fileDataUrl, setFileDataUrl] = useState(currentDocument ? currentDocument.fileUrl || '' : '');
  const [fileName, setFileName] = useState(currentDocument ? currentDocument.fileName || '' : '');
  const [fileMimeType, setFileMimeType] = useState(currentDocument ? currentDocument.fileMimeType || '' : '');
  
  const isEditing = !!currentDocument;
  const { theme } = useTheme();

  const cardClass = getThemedClasses('bg-card', theme);
  const textClass = getThemedClasses('text-card', theme);
  const headingClass = getThemedClasses('text-heading', theme);
  const inputClass = getThemedClasses('input', theme);
  const primaryBtnClass = getThemedClasses('btn-primary', theme);
  const secondaryBtnClass = getThemedClasses('btn-secondary', theme);
  const iconClass = getThemedClasses('icon', theme);

  const handleFileChange = (e) => {
    setError(null);
    const file = e.target.files[0];
    if (!file) {
      setFileDataUrl('');
      setFileName('');
      setFileMimeType('');
      return;
    }

    // Check against the 1MB limit for localStorage/document safety
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`FILE SIZE WARNING: Maximum supported size is 1MB. Larger files cannot be securely stored in the document fragment.`);
      setFileDataUrl('');
      setFileName('');
      setFileMimeType('');
      e.target.value = null; // Clear file input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      // Store Base64 data URL
      setFileDataUrl(event.target.result);
      setFileName(file.name);
      setFileMimeType(file.type);
      // Clear text content if a file is uploaded
      setContent('');
    };
    reader.onerror = () => {
        setError("FILE READ FAILED. PROTOCOL INTERRUPTED.");
        setFileDataUrl('');
        setFileName('');
        setFileMimeType('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFileDataUrl('');
    setFileName('');
    setFileMimeType('');
    if (fileInputRef.current) {
        fileInputRef.current.value = null;
    }
    setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
        setError("TITLE FIELD IS MANDATORY.");
        return;
    }
    if (!content.trim() && !fileDataUrl) {
        setError("CONTENT OR FILE ATTACHMENT REQUIRED.");
        return;
    }
    setError(null);

    const docData = {
      title,
      content: fileDataUrl ? '' : content, // Clear content if file is attached
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      fileUrl: fileDataUrl || null,
      fileName: fileName || null,
      fileMimeType: fileMimeType || null,
    };
    onSave(docData);
    if (!isEditing) {
      setTitle('');
      setContent('');
      setTags('');
      handleRemoveFile(); // Reset file fields
    }
  };

  return (
    <div className={`p-6 rounded-xl ${cardClass}`}>
      <h3 className={`text-2xl font-bold mb-4 flex items-center ${headingClass}`}>
        {isEditing ? (
          <><Edit2 className={`w-5 h-5 mr-2 ${iconClass}`} /> EDIT DATA FRAGMENT</>
        ) : (
          <><Plus className={`w-5 h-5 mr-2 ${iconClass}`} /> NEW DATA ENTRY</>
        )}
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className={`block text-sm font-bold mb-1 ${textClass}`}>DATA TITLE</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 rounded-md focus:outline-none ${inputClass}`}
            required
            placeholder="e.g., Q3 FINANCIAL LOGS"
          />
        </div>

        {/* File Upload Section */}
        <div className="mb-4 p-4 border border-purple-600 rounded-lg">
            <label className={`block text-sm font-bold mb-2 ${textClass} flex items-center`}>
                <Upload className="w-4 h-4 mr-2" />
                FILE ATTACHMENT (MAX 1MB)
            </label>
            
            {fileName ? (
                <div className={`flex items-center justify-between p-2 rounded-md ${getThemedClasses('bg-base', theme)} opacity-80`}>
                    <span className="text-xs font-semibold truncate">{fileName}</span>
                    <button type="button" onClick={handleRemoveFile} className={`p-1 rounded-full hover:bg-red-700 transition duration-150`}>
                        <X className="w-4 h-4 text-red-400" />
                    </button>
                </div>
            ) : (
                <>
                    <input
                        ref={fileInputRef}
                        id="file-upload"
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className={`w-full py-2 border-dashed border-2 rounded-md transition duration-150 flex items-center justify-center ${secondaryBtnClass}`}
                    >
                        BROWSE FILES (PDF, PNG, JPG, ETC.)
                    </button>
                </>
            )}
        </div>
        
        {/* Text Content Area (Hidden if file is present, but kept for editing old text docs) */}
        <div className="mb-4">
          <label htmlFor="content" className={`block text-sm font-bold mb-1 ${textClass} ${fileDataUrl ? 'opacity-50' : ''}`}>
              DATA CONTENT (TEXT)
          </label>
          <textarea
            id="content"
            rows="6"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 rounded-md focus:outline-none resize-none ${inputClass}`}
            placeholder="PASTE DATA STREAM HERE..."
            disabled={!!fileDataUrl} // Disable if file is attached
            required={!fileDataUrl} // Required only if no file is attached
          ></textarea>
        </div>
        
        <div className="mb-6">
          <label htmlFor="tags" className={`block text-sm font-bold mb-1 ${textClass}`}>TAGS (COMMA SEPARATED)</label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 rounded-md focus:outline-none ${inputClass}`}
            placeholder="e.g., FINANCE, REPORT, URGENT"
          />
        </div>

        <div className="flex justify-end space-x-3">
          {isEditing && (
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 text-sm font-bold rounded-md transition duration-150 flex items-center ${secondaryBtnClass}`}
            >
              <X className="w-4 h-4 mr-1" />
              CANCEL
            </button>
          )}
          <button
            type="submit"
            className={`px-4 py-2 text-sm font-bold rounded-md transition duration-150 flex items-center ${primaryBtnClass}`}
          >
            {isEditing ? (
              <><Save className="w-4 h-4 mr-1" /> UPDATE FRAGMENT</>
            ) : (
              <><Plus className="w-4 h-4 mr-1" /> STORE FRAGMENT</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const DocumentList = ({ documents, onEdit, onInitiateDelete, onView }) => {
  const { theme } = useTheme();
  const cardClass = getThemedClasses('bg-card', theme);
  const textClass = getThemedClasses('text-card', theme);
  const tagClass = getThemedClasses('tag', theme);
  const iconClass = getThemedClasses('icon', theme);
  const btnPrimaryClass = getThemedClasses('btn-primary', theme);
  const btnDangerClass = getThemedClasses('btn-danger', theme);
  const btnSecondaryClass = getThemedClasses('btn-secondary', theme);


  if (documents.length === 0) {
    return (
      <div className={`text-center p-10 border-2 border-dashed rounded-xl ${cardClass} ${textClass} border-purple-600`}>
        <FileText className={`w-10 h-10 mx-auto ${iconClass}`} />
        <p className="mt-2 text-lg font-bold">NO DATA ENTRIES.</p>
        <p className="text-sm">INITIATE NEW DATA STREAM ABOVE.</p>
      </div>
    );
  }

  // NOTE: Documents are sorted by creation date (highest timestamp first) in the parent component
  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div key={doc.id} className={`p-4 rounded-xl ${cardClass} hover:shadow-neon-blue-lg transition duration-300 flex justify-between items-start`}>
          <div className="flex-1 min-w-0 pr-4">
            <div className={`text-lg font-bold truncate ${textClass}`}>
                <Folder className={`w-4 h-4 inline mr-2 ${iconClass}`} />
                {doc.title}
            </div>
            <div className="text-sm mt-1">
              {doc.tags.map(tag => (
                <span key={tag} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${tagClass}`}>
                  {tag}
                </span>
              ))}
              {(doc.fileUrl && doc.fileName) && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-800 text-green-200 shadow-neon-green-sm ml-2`}>
                    FILE: {doc.fileName.split('.').pop().toUpperCase()}
                  </span>
              )}
            </div>
            <div className={`text-xs mt-2 ${textClass} opacity-70`}>
                CREATED: {new Date(doc.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onView(doc)}
              className={`p-2 text-sm font-medium rounded-full transition duration-150 shadow-md ${btnSecondaryClass}`}
              title="VIEW DATA"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => onEdit(doc)}
              className={`p-2 text-sm font-medium rounded-full transition duration-150 shadow-md ${btnPrimaryClass}`}
              title="EDIT DATA"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onInitiateDelete(doc.id, doc.title)}
              className={`p-2 text-sm font-medium rounded-full transition duration-150 shadow-md ${btnDangerClass}`}
              title="DELETE DATA"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const DocumentModal = ({ document, onClose }) => {
    const { theme } = useTheme();
    const cardClass = getThemedClasses('bg-card', theme);
    const textClass = getThemedClasses('text-card', theme);
    const headingClass = getThemedClasses('text-heading', theme);
    const primaryBtnClass = getThemedClasses('btn-primary', theme);
    const secondaryBtnClass = getThemedClasses('btn-secondary', theme);
    const iconClass = getThemedClasses('icon', theme);

    if (!document) return null;

    const hasFile = document.fileUrl && document.fileMimeType;
    const isImage = hasFile && document.fileMimeType.startsWith('image/');
    const isPdf = hasFile && document.fileMimeType === 'application/pdf';

    const handleDownload = () => {
        if (!document.fileUrl || !document.fileName || !document.fileMimeType) {
            console.error("Download failed: File data missing.");
            return;
        }

        try {
            // 1. Create a temporary anchor element
            const a = window.document.createElement('a');
            a.href = document.fileUrl; // This is the Base64 data URL
            a.download = document.fileName;

            // 2. Trigger the download
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
        }
    };


    const renderFileContent = () => {
        if (isImage) {
            return (
                <img
                    src={document.fileUrl}
                    alt={document.fileName || "Uploaded file"}
                    className="max-w-full h-auto rounded-lg shadow-lg border border-purple-500 mx-auto"
                    style={{ maxHeight: '65vh' }}
                />
            );
        } else if (isPdf) {
            // Using object tag for embedded PDF viewing via data URL (often fails)
            return (
                <object
                    data={document.fileUrl}
                    type="application/pdf"
                    width="100%"
                    height="600px"
                    className="border border-indigo-500 rounded-lg shadow-xl"
                >
                    <p className="p-4 text-center text-red-400">PDF viewer unavailable. Please use the download button to access the file.</p>
                </object>
            );
        } else if (hasFile) {
            // General file viewer (might work for HTML/TXT/simple docs)
             return (
                <iframe
                    src={document.fileUrl}
                    width="100%"
                    height="600px"
                    className="border border-indigo-500 rounded-lg shadow-xl bg-gray-900"
                    title={document.fileName || "File Preview"}
                >
                    <p className="p-4 text-center text-red-400">File preview unavailable. Please use the download button to access the file.</p>
                </iframe>
            );
        } else {
            // Text content
            return (
                <div className={`p-4 rounded-lg border ${getThemedClasses('bg-card', theme)} whitespace-pre-wrap text-sm leading-relaxed`}>
                    {document.content || "NO TEXT DATA AVAILABLE"}
                </div>
            );
        }
    };


    return (
        <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className={`rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${cardClass}`}>
                <div className={`p-6 border-b border-purple-700 flex justify-between items-center sticky top-0 ${getThemedClasses('bg-card-dark', theme)} ${getThemedClasses('bg-card-light', theme)} z-10`}>
                    <h2 className={`text-2xl font-bold flex items-center ${headingClass}`}>
                        <FileText className={`w-6 h-6 mr-2 ${iconClass}`} />
                        {document.title}
                    </h2>
                    <button onClick={onClose} className={`p-2 ${textClass} opacity-70 hover:opacity-100 transition duration-150`}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className={`p-6 ${textClass}`}>
                    <p className="mb-4 font-bold text-sm opacity-80">
                        TYPE: {hasFile ? document.fileName.split('.').pop().toUpperCase() : 'TEXT FRAGMENT'}
                        <br/>
                        TAGS: {document.tags.length > 0 ? document.tags.join(', ') : 'NONE'}
                    </p>
                    {renderFileContent()}
                </div>
                <div className={`p-4 border-t border-purple-700 flex justify-end space-x-3 sticky bottom-0 ${getThemedClasses('bg-card-dark', theme)} ${getThemedClasses('bg-card-light', theme)} z-10`}>
                    {hasFile && (
                        <button onClick={handleDownload} className={`px-4 py-2 text-sm font-bold rounded-md transition duration-150 flex items-center ${secondaryBtnClass}`}>
                            <Download className="w-4 h-4 mr-1" />
                            DOWNLOAD FRAGMENT
                        </button>
                    )}
                    <button onClick={onClose} className={`px-4 py-2 text-sm font-bold rounded-md ${primaryBtnClass}`}>
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Application Component ---

const AppContent = () => { // Renamed to AppContent to be wrapped by ThemeProvider
  // Authentication & Security State
  const userId = getInitialUserId();
  const [passwordStatus, setPasswordStatus] = useState('loading'); // 'loading', 'uninitialized', 'required', 'authenticated'
  const [storedHash, setStoredHash] = useState(null);

  // Document State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  
  // Deletion State for Custom Modal
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [docToDeleteId, setDocToDeleteId] = useState(null);
  const [docToDeleteTitle, setDocToDeleteTitle] = useState('');

  const { theme, toggleTheme } = useTheme();

  const baseBgClass = getThemedClasses('bg-base', theme);
  const baseTextClass = getThemedClasses('text-base', theme);
  const headingClass = getThemedClasses('text-heading', theme);
  const cardClass = getThemedClasses('bg-card', theme);
  const iconClass = getThemedClasses('icon', theme);
  const msgWarningClass = getThemedClasses('msg-warning', theme);
  const msgErrorClass = getThemedClasses('msg-error', theme);


  // 1. Initial Load and Password Check Effect
  useEffect(() => {
    // Load documents immediately (they will only be rendered if password check passes)
    const storedDocs = getLocalData(DOCUMENTS_STORAGE_KEY, []);
    // Sort documents by creation date descending
    storedDocs.sort((a, b) => b.createdAt - a.createdAt);
    setDocuments(storedDocs);

    // Check password hash
    const settings = getLocalData(SETTINGS_STORAGE_KEY, {});
    const hash = settings.passwordHash;

    if (hash) {
        setStoredHash(hash);
        setPasswordStatus('required');
    } else {
        setPasswordStatus('uninitialized');
    }

    setLoading(false);
  }, []);

  // 2. Local Storage Sync Effect (When documents change, save them)
  useEffect(() => {
    if (passwordStatus === 'authenticated') {
        setLocalData(DOCUMENTS_STORAGE_KEY, documents);
    }
  }, [documents, passwordStatus]);

  // --- CRUD Operations ---

  const handleAddOrUpdateDocument = (docData) => {
    setLoading(true);
    setError(null);
    
    // Use current time as unique ID and for sorting
    const now = Date.now(); 

    try {
      if (editingDoc) {
        // Update existing document
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === editingDoc.id ? { ...doc, ...docData, updatedAt: now } : doc
          ).sort((a, b) => b.createdAt - a.createdAt) // Re-sort after update
        );
        setEditingDoc(null);
      } else {
        // Add new document
        const newDoc = {
          id: now.toString(), // Simple unique ID for local storage
          ...docData,
          createdAt: now,
        };
        setDocuments(prevDocs => 
            [newDoc, ...prevDocs].sort((a, b) => b.createdAt - a.createdAt) // Add new doc and re-sort
        );
      }
    } catch (e) {
      console.error("Error saving document:", e);
      setError("SAVE PROTOCOL FAILED. DATA CORRUPTION RISK. (Check browser storage capacity)");
    } finally {
      setLoading(false);
    }
  };

  // 1. Initiates the custom confirmation modal
  const handleInitiateDelete = (id, title) => {
      setDocToDeleteId(id);
      setDocToDeleteTitle(title);
      setIsConfirmingDelete(true);
  };

  // 2. Executes the deletion after confirmation
  const handleConfirmDelete = () => {
    setIsConfirmingDelete(false);
    if (!docToDeleteId) return;

    setLoading(true);
    try {
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docToDeleteId));
      setError(null);
    } catch (e) {
      console.error("Error deleting document:", e);
      setError("ERADICATION PROTOCOL FAILED. DATA PERSISTING.");
    } finally {
      setLoading(false);
      setDocToDeleteId(null);
      setDocToDeleteTitle('');
    }
  };
  
  const handleCancelDelete = () => {
      setIsConfirmingDelete(false);
      setDocToDeleteId(null);
      setDocToDeleteTitle('');
  };

  const handleStartEdit = (doc) => {
      setEditingDoc(doc);
      setViewingDoc(null);
  };

  const handleCancelEdit = () => {
      setEditingDoc(null);
  };

  const handleView = (doc) => {
      setViewingDoc(doc);
      setEditingDoc(null);
  }

  const handleAuthenticated = (hash) => {
      setStoredHash(hash);
      setPasswordStatus('authenticated');
      // Force immediate re-render of documents after authentication
      const storedDocs = getLocalData(DOCUMENTS_STORAGE_KEY, []);
      storedDocs.sort((a, b) => b.createdAt - a.createdAt);
      setDocuments(storedDocs);
  }

  // --- Render Logic ---

  if (loading || passwordStatus === 'loading') {
    return (
      <div className={`flex items-center justify-center min-h-screen ${baseBgClass} ${baseTextClass}`}>
        <Loader2 className={`w-10 h-10 ${iconClass} animate-spin mr-3 drop-shadow-neon-blue`} />
        <p className="text-xl">INITIATING SECURE PROTOCOLS...</p>
      </div>
    );
  }

  if (passwordStatus === 'uninitialized') {
    return (
        <div className={`flex items-center justify-center min-h-screen ${baseBgClass} p-4`}>
            <PasswordSetup onAuthenticated={handleAuthenticated} />
        </div>
    );
  }

  if (passwordStatus === 'required') {
    return (
        <div className={`flex items-center justify-center min-h-screen ${baseBgClass} p-4`}>
            <PasswordGate storedHash={storedHash} onAuthenticated={handleAuthenticated} />
        </div>
    );
  }

  // --- Main App Content (Only rendered when passwordStatus === 'authenticated') ---
  return (
    <div className={`min-h-screen ${baseBgClass} ${baseTextClass} transition-colors duration-500`}>
      {/* Global Font and Neon Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Mono:wght@400;600&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }
        
        .font-mono {
            font-family: 'Roboto Mono', monospace;
        }

        /* Neon Glow Utility Classes (retained) */
        .drop-shadow-neon-blue {
          text-shadow: 0 0 5px #0ff, 0 0 10px #0ff, 0 0 15px #0ff, 0 0 20px #0ff;
        }
        .drop-shadow-neon-purple {
          text-shadow: 0 0 5px #f0f, 0 0 10px #f0f, 0 0 15px #f0f, 0 0 20px #f0f;
        }

        .shadow-neon-blue-sm {
            box-shadow: 0 0 3px rgba(0, 255, 255, 0.5);
        }
        .shadow-neon-blue-lg {
            box-shadow: 0 0 8px rgba(0, 255, 255, 0.7), 0 0 15px rgba(0, 255, 255, 0.4);
        }
        .shadow-neon-purple-sm {
            box-shadow: 0 0 3px rgba(255, 0, 255, 0.5);
        }
        .shadow-neon-purple {
            box-shadow: 0 0 5px rgba(255, 0, 255, 0.7), 0 0 10px rgba(255, 0, 255, 0.4);
        }
        .shadow-neon-red-sm {
            box-shadow: 0 0 3px rgba(255, 0, 0, 0.5);
        }
        .shadow-neon-green-sm {
            box-shadow: 0 0 3px rgba(0, 255, 0, 0.5);
        }

        .shadow-inner-neon-blue {
            box-shadow: inset 0 0 5px rgba(0, 255, 255, 0.5);
        }
        .shadow-inner-neon-purple {
            box-shadow: inset 0 0 5px rgba(255, 0, 255, 0.5);
        }

        /* Light Theme Specific Neon Glow */
        html[data-theme='light'] .drop-shadow-neon-blue-light {
          text-shadow: 0 0 3px rgba(0, 100, 255, 0.5);
        }
        html[data-theme='light'] .shadow-neon-blue-light {
            box-shadow: 0 0 5px rgba(0, 100, 255, 0.3), 0 0 10px rgba(0, 100, 255, 0.2);
        }
        html[data-theme='light'] .shadow-neon-blue-light-lg {
            box-shadow: 0 0 8px rgba(0, 100, 255, 0.4), 0 0 15px rgba(0, 100, 255, 0.3);
        }
        html[data-theme='light'] .shadow-neon-blue-light-sm {
            box-shadow: 0 0 3px rgba(0, 100, 255, 0.2);
        }
        html[data-theme='light'] .shadow-inner-neon-blue-light {
            box-shadow: inset 0 0 3px rgba(0, 100, 255, 0.3);
        }
        html[data-theme='light'] .shadow-neon-red-light-sm {
            box-shadow: 0 0 3px rgba(255, 0, 0, 0.3);
        }
      `}</style>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header and User Info */}
        <header className="mb-8 border-b border-purple-700 pb-4 flex justify-between items-center">
          <div>
            <h1 className={`text-4xl font-extrabold ${headingClass} flex items-center`}>
              <Folder className={`w-8 h-8 mr-3 ${iconClass}`} />
              SECURE DATABANK
            </h1>
            <p className={`mt-2 ${baseTextClass} opacity-70`}>
              ACCESS GRANTED. DATA STREAM LIVE. (Local Storage Mode)
            </p>
            <div className={`mt-3 p-2 rounded-lg text-sm flex items-center ${cardClass} opacity-80`}>
                <LogIn className={`w-4 h-4 mr-2 ${iconClass}`} />
                USER ID:
                <code className={`ml-2 font-bold truncate max-w-[200px] sm:max-w-full ${baseTextClass} font-mono`}>{userId}</code>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-3 rounded-full ${getThemedClasses('bg-card', theme)} ${getThemedClasses('text-card', theme)} hover:shadow-neon-blue-lg transition duration-300`}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6 text-yellow-300" /> : <Moon className="w-6 h-6 text-indigo-700" />}
          </button>
        </header>

        {/* Loading and Error Indicators */}
        {loading && (
          <div className={`p-3 mb-4 rounded-lg flex items-center shadow-neon-yellow-sm ${msgWarningClass}`}>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            PROCESSING DATA PACKET...
          </div>
        )}
        {error && (
          <div className={`p-3 mb-4 rounded-lg flex items-center shadow-neon-red-sm ${msgErrorClass}`}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Management Form (Left/Top) */}
          <div className="lg:col-span-1">
            <DocumentForm
              currentDocument={editingDoc}
              onSave={handleAddOrUpdateDocument}
              onCancel={handleCancelEdit}
              setError={setError} 
            />
          </div>

          {/* Document List (Right/Bottom) */}
          <div className="lg:col-span-2">
            <h2 className={`text-2xl font-bold mb-4 ${headingClass}`}>
                ACTIVE DATA FRAGMENTS
            </h2>
            <DocumentList
              documents={documents}
              onEdit={handleStartEdit}
              onInitiateDelete={handleInitiateDelete} 
              onView={handleView}
            />
          </div>
        </div>
      </div>

      {/* Document View Modal */}
      <DocumentModal
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />
      
      {/* Custom Confirmation Modal for Deletion */}
      <ConfirmationModal
          isOpen={isConfirmingDelete}
          title="DELETION PROTOCOL INITIATED"
          message={`Are you absolutely sure you want to eradicate the data fragment titled "${docToDeleteTitle}"? This action is irreversible.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
      />
    </div>
  );
};

// Main App component to include the ThemeProvider
const App = () => (
    <ThemeProvider>
        <AppContent />
    </ThemeProvider>
);

export default App;