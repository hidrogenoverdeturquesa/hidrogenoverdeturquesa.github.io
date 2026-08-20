\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{hvtbook}[2026/08/15 Cuadernillos HVT]
\LoadClass[11pt]{article}

\RequirePackage[spanish]{babel}
\RequirePackage{iftex}
\ifPDFTeX
  \RequirePackage[utf8]{inputenc}
  \RequirePackage[T1]{fontenc}
  \RequirePackage[scaled=.95]{helvet}
\else
  \RequirePackage{fontspec}
  \setmainfont{Arial}
  \setsansfont{Arial}
\fi
\RequirePackage{graphicx}
\RequirePackage{xcolor}
\RequirePackage[a4paper,landscape,margin=1.5cm]{geometry}
\RequirePackage{enumitem}
\RequirePackage[most]{tcolorbox}
\RequirePackage{multicol}
\RequirePackage{pagecolor}
\RequirePackage{ragged2e}
\RequirePackage{microtype}
\RequirePackage{tabularx}
\RequirePackage{colortbl}
\RequirePackage{hyperref}

\renewcommand{\familydefault}{\sfdefault}
\definecolor{hvt}{HTML}{00A98F}
\definecolor{hvtText}{HTML}{202225}
\definecolor{hvtMuted}{HTML}{6C737D}
\definecolor{hvtPaper}{HTML}{EEF1F0}
\definecolor{hvtPanel}{HTML}{F0F1F2}
\definecolor{hvtExample}{HTML}{E9ECEC}
\hypersetup{colorlinks=true,linkcolor=hvt,urlcolor=hvt,pageanchor=false}
\pagecolor{hvtPaper}
\color{hvtText}
\setlength{\parindent}{0pt}
\setlength{\parskip}{7pt}
\hyphenpenalty=10000
\exhyphenpenalty=10000
\pagestyle{empty}
\setlist{itemsep=5pt,topsep=5pt,leftmargin=1.5em}

\newcommand{\HVTTitulo}[1]{\def\hvtTitulo{#1}}
\newcommand{\HVTSubtitulo}[1]{\def\hvtSubtitulo{#1}}
\newcommand{\HVTNivel}[1]{\def\hvtNivel{#1}}
\newcommand{\HVTNumero}[1]{\def\hvtNumero{#1}}
\def\hvtSerie{Guía formativa}
\def\hvtAccion{Empezar}
\newcommand{\HVTSerie}[1]{\def\hvtSerie{#1}}
\newcommand{\HVTAccion}[1]{\def\hvtAccion{#1}}
\newcommand{\HVTDescripcion}[1]{}
\newcommand{\HVTCanonical}[1]{}
\newcommand{\HVTRegreso}[2]{}
\newcommand{\HVTPortada}[2]{\def\hvtPortada{#1}\def\hvtPiePortada{#2}}

\newcommand{\HVTMakeTitle}{%
  \begin{titlepage}
  \begin{tcolorbox}[enhanced,width=\textwidth,height=.89\textheight,colback=white,
    colframe=white,boxrule=0pt,arc=0pt,drop shadow={black!16!hvtPaper},
    left=12mm,right=12mm,top=12mm,bottom=10mm]
  \begin{minipage}[t][.72\textheight][c]{.58\linewidth}\RaggedRight
    {\small\color{hvt}\bfseries\MakeUppercase{\hvtSerie\ \hvtNumero\ · \hvtNivel}\par}
    \vspace{8mm}
    {\fontsize{30}{33}\selectfont\bfseries \hvtTitulo\par}
    \vspace{7mm}
    {\Large\color{hvtMuted}\hvtSubtitulo\par}
    \vspace{10mm}
    \colorbox{hvt}{\parbox[c][9mm][c]{50mm}{\centering\color{white}\bfseries\MakeUppercase{\hvtAccion}}}
  \end{minipage}\hfill
  \begin{minipage}[t][.72\textheight][c]{.35\linewidth}
    \begin{tcolorbox}[colback=white,colframe=hvtMuted!30,boxrule=.5pt,arc=0pt,
      left=5mm,right=5mm,top=5mm,bottom=4mm]
      \centering
      \includegraphics[height=10.2cm,width=\linewidth,keepaspectratio]{\hvtPortada}\par
      \small\bfseries\color{hvtMuted}\hvtPiePortada
    \end{tcolorbox}
  \end{minipage}
  \end{tcolorbox}
  \end{titlepage}}

\newcommand{\HVTLead}[1]{\par{\large\bfseries\color{hvtMuted}#1}\par\medskip}
\newcommand{\HVTText}[1]{\par #1\par\medskip}
\newcommand{\HVTHeading}[1]{\par\medskip{\Large\bfseries #1}\par\smallskip}
\newcommand{\HVTCite}[1]{\textsuperscript{\color{hvt}[#1]}}
\newcommand{\HVTImagen}[2]{%
  \begin{tcolorbox}[enhanced,colback=white,colframe=hvtPanel,boxrule=.5pt,arc=0pt,
    left=5mm,right=5mm,top=4mm,bottom=3mm]
    \centering\includegraphics[height=4.4cm,width=.78\linewidth,keepaspectratio]{#1}\par
    \small\bfseries\color{hvtMuted}#2
  \end{tcolorbox}}
\newenvironment{HVTPage}[3]{%
  \clearpage
  \begin{tcolorbox}[enhanced,width=\textwidth,height=.98\textheight,colback=white,
    colframe=hvtMuted!35,boxrule=.5pt,arc=0pt,drop shadow={black!16!hvtPaper},
    left=9mm,right=9mm,top=9mm,bottom=7mm]
  \begin{minipage}[t][.87\textheight]{.19\linewidth}\raggedright
    {\small\bfseries\color{hvt}\MakeUppercase{#1}}\par\smallskip
    {\Large\bfseries #2}\par
    \vspace{4mm}\color{hvtMuted!40}\rule{\linewidth}{.5pt}
  \end{minipage}\hfill
  {\color{hvtMuted!35}\vrule width .5pt}\hfill
  \begin{minipage}[t][.87\textheight]{.72\linewidth}\RaggedRight
    {\LARGE\bfseries #3}\par\medskip
}{\end{minipage}\end{tcolorbox}\clearpage}
\newenvironment{HVTGrid}{\begin{multicols}{2}\raggedcolumns}{\end{multicols}}
\newenvironment{HVTColumn}[1]{%
  \begin{tcolorbox}[enhanced,colback=hvtPanel,colframe=hvtPanel,boxrule=0pt,
    borderline west={2mm}{0pt}{hvt},arc=0pt,left=5mm,right=4mm,top=3mm,bottom=3mm]
  {\large\bfseries #1}\par\smallskip}{\end{tcolorbox}}
\newenvironment{HVTExample}[2]{%
  \begin{tcolorbox}[enhanced,colback=hvtExample,colframe=hvtExample,boxrule=0pt,
    borderline west={3mm}{0pt}{hvt},arc=0pt,left=6mm,right=5mm,top=4mm,bottom=4mm]
  {\small\bfseries\color{hvt}\MakeUppercase{#1}}\par
  {\Large\bfseries #2}\par\smallskip}{\end{tcolorbox}}
\newcommand{\HVTStepNumber}[1]{%
  \tikz[baseline=(n.base)]{\node[rectangle,fill=hvt,text=white,font=\bfseries,
    minimum width=9mm,minimum height=9mm,inner sep=0pt](n){#1};}}
\newenvironment{HVTSteps}{%
  \begin{enumerate}[leftmargin=12mm,label=\protect\HVTStepNumber{\arabic*}]
}{\end{enumerate}}

% Diagrama horizontal de tres o más componentes.
\newenvironment{HVTFlow}{%
  \begin{tcbraster}[raster columns=3,raster equal height,raster column skip=4mm]
}{\end{tcbraster}}
\newcommand{\HVTFlowItem}[3]{%
  \begin{tcolorbox}[colback=white,colframe=hvtMuted!35,boxrule=.5pt,arc=0pt,
    left=4mm,right=4mm,top=3mm,bottom=3mm]
    \RaggedRight
    \colorbox{hvt}{\makebox[8mm][c]{\color{white}\bfseries #1}}\par\smallskip
    {\bfseries #2}\par{\small\color{hvtMuted}#3}
  \end{tcolorbox}}

% Fórmula técnica con una explicación legible.
\newcommand{\HVTEquation}[2]{%
  \begin{tcolorbox}[enhanced,colback=hvtPanel,colframe=hvtPanel,boxrule=0pt,arc=0pt,
    borderline west={2mm}{0pt}{hvt},left=5mm,right=5mm,top=3mm,bottom=3mm]
    \[\displaystyle #1\]
    \centering\small\color{hvtMuted}#2
  \end{tcolorbox}}

% Dos o más figuras colocadas en una cuadrícula.
\newenvironment{HVTGallery}{%
  \begin{tcbraster}[raster columns=2,raster equal height,raster column skip=4mm]
}{\end{tcbraster}}

% Tabla técnica de tres columnas.
\newenvironment{HVTTable}[3]{%
  \par\medskip
  \begingroup
  \arrayrulecolor{hvtMuted!24}
  \setlength{\arrayrulewidth}{.35pt}
  \setlength{\tabcolsep}{3.2mm}
  \renewcommand{\arraystretch}{1.58}
  \small
  \begin{tabular}{|>{\RaggedRight\arraybackslash}p{.15\linewidth}|>{\RaggedRight\arraybackslash}p{.355\linewidth}|>{\RaggedRight\arraybackslash}p{.355\linewidth}|}\hline
  \rowcolor{hvtPanel}\bfseries #1 & \bfseries #2 & \bfseries #3\\\hline
}{\end{tabular}\endgroup\par\medskip}
\newcommand{\HVTTableRow}[3]{#1 & #2 & #3\\\hline}

\newenvironment{HVTWarning}[1]{%
  \begin{tcolorbox}[colback=white,colframe=hvt,boxrule=.7pt,arc=0pt,
    left=4mm,right=4mm,top=3mm,bottom=3mm]
  {\bfseries #1:}\par\smallskip
}{\end{tcolorbox}}

\newenvironment{HVTTask}[1]{%
  \begin{tcolorbox}[enhanced,colback=hvtPanel,colframe=hvtPanel,boxrule=0pt,arc=0pt,
    borderline west={2mm}{0pt}{hvt},left=5mm,right=4mm,top=3mm,bottom=3mm]
  {\large\bfseries #1}\par\smallskip\begin{itemize}
}{\end{itemize}\end{tcolorbox}}

\newenvironment{HVTTaskOrdered}[1]{%
  \begin{tcolorbox}[enhanced,colback=hvtPanel,colframe=hvtPanel,boxrule=0pt,arc=0pt,
    borderline west={2mm}{0pt}{hvt},left=5mm,right=4mm,top=3mm,bottom=3mm]
  {\large\bfseries #1}\par\smallskip\begin{enumerate}
}{\end{enumerate}\end{tcolorbox}}

\newcommand{\HVTContact}[2]{%
  \par\medskip
  \href{#2}{\colorbox{hvt}{\parbox[c][11mm][c]{.86\linewidth}{\centering\color{white}\bfseries\MakeUppercase{#1}}}}}

\newenvironment{HVTCode}[1]{%
  \begin{tcolorbox}[colback=hvtText,colframe=hvtText,coltext=white,boxrule=0pt,
    arc=0pt,left=5mm,right=5mm,top=3mm,bottom=3mm]
  {\bfseries #1}\par\smallskip\ttfamily\obeylines\obeyspaces
}{\end{tcolorbox}}

\newenvironment{HVTReferences}{%
  {\Large\bfseries Referencias}\par\smallskip
  \begin{enumerate}[leftmargin=6mm]
}{\end{enumerate}}
\newcommand{\HVTReference}[2]{\item \href{#2}{#1}.}
