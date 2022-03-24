import React, { Component } from "react";

import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  Highlight,
  Popup,
  AreaHighlight,
} from "./react-pdf-highlighter";

import type { IHighlight, NewHighlight } from "./react-pdf-highlighter";

import { testHighlights as _testHighlights } from "./test-highlights";
import { Spinner } from "./Spinner";
import { Sidebar } from "./Sidebar";

import "./style/App.css";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

interface State {
  url: string;
  highlights: Array<IHighlight>;
  scale: string;
  showSideBar: boolean;
}

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021.pdf";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480.pdf";

const searchParams = new URLSearchParams(document.location.search);

const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

class App extends Component<{}, State> {

  private pdfHighlighterRef = React.createRef<PdfHighlighter<IHighlight>>();

  state = {
    url: initialUrl,
    highlights: testHighlights[initialUrl]
      ? [...testHighlights[initialUrl]]
      : [],
    scale: "Scale 100%",
    showSideBar: false,
  };

  resetHighlights = () => {
    this.setState({
      highlights: [],
    });
  };

  toggleDocument = () => {
    const newUrl =
      this.state.url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;

    this.setState({
      url: newUrl,
      highlights: testHighlights[newUrl] ? [...testHighlights[newUrl]] : [],
    });
  };

  scrollViewerTo = (highlight: any) => { };

  scrollToHighlightFromHash = () => {
    const highlight = this.getHighlightById(parseIdFromHash());

    if (highlight) {
      this.scrollViewerTo(highlight);
    }
  };

  componentDidMount() {
    window.addEventListener(
      "hashchange",
      this.scrollToHighlightFromHash,
      false
    );
  }

  getHighlightById(id: string) {
    const { highlights } = this.state;

    return highlights.find((highlight) => highlight.id === id);
  }

  addHighlight(highlight: NewHighlight) {
    const { highlights } = this.state;

    console.log("Saving highlight", JSON.stringify(highlight));

    this.setState({
      highlights: [{ ...highlight, id: getNextId() }, ...highlights],
    });
  }

  updateHighlight(highlightId: string, position: Object, content: Object) {
    console.log("Updating highlight", highlightId, position, content);

    this.setState({
      highlights: this.state.highlights.map((h) => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
            id,
            position: { ...originalPosition, ...position },
            content: { ...originalContent, ...content },
            ...rest,
          }
          : h;
      }),
    });
  }

  static MIN_SCALE = 0.2;
  static MAX_SCALE = 2;

  handleZoomOut() {
    if (this.pdfHighlighterRef.current && this.pdfHighlighterRef.current.viewer) {
      let newScale = this.pdfHighlighterRef.current.viewer.currentScale;
      newScale = newScale - 0.10;
      this.setCurrentScaleToViewer(Math.max(App.MIN_SCALE, newScale));
    }
  }

  handleZoomIn() {
    if (this.pdfHighlighterRef.current && this.pdfHighlighterRef.current.viewer) {
      let newScale = this.pdfHighlighterRef.current.viewer.currentScale;
      newScale = newScale + 0.10;
      this.setCurrentScaleToViewer(Math.min(App.MAX_SCALE, newScale));
    }
  }

  setCurrentScaleToViewer(scale: number) {
    if (this.pdfHighlighterRef.current && this.pdfHighlighterRef.current.viewer) {
      const current = this.pdfHighlighterRef.current;
      const percent = (scale * 100).toFixed(0);
      current.viewer.currentScaleValue = scale.toFixed(2);
      current.renderHighlights();
      this.setState({ scale: `Scale ${percent}%` });
    }
  }

  toggleSideBar() {
    const show = this.state.showSideBar;
    this.setState({ showSideBar: !show });
  }

  render() {
    const { url, highlights, showSideBar, scale } = this.state;

    return (
      <div className="App" style={{ display: "flex", height: "100vh", position: "relative" }}>
        <Sidebar
          showSideBar={showSideBar}
          highlights={highlights}
          resetHighlights={this.resetHighlights}
          toggleDocument={this.toggleDocument}
        />
        <div
          style={{
            height: "100vh",
            width: "100vw",
            position: "relative",
          }}
        >
          <div className="zoomControls" style={{ position: "absolute", top: 0, left: 0, zIndex: 20 }}>
            <button onClick={() => this.toggleSideBar()}>Sidebar</button>
            <button onClick={() => this.handleZoomOut()}>-- Zoom</button>
            <button onClick={() => this.handleZoomIn()}>++ Zoom</button>
            <span style={{ color: "black", marginLeft: 5 }}>{scale}</span>
          </div>
          <PdfLoader url={url} beforeLoad={<Spinner />}>
            {(pdfDocument) => (
              <PdfHighlighter
                ref={this.pdfHighlighterRef}
                pdfDocument={pdfDocument}
                enableAreaSelection={(event) => event.altKey}
                onScrollChange={resetHash}
                pdfScaleValue="1.0"
                scrollRef={(scrollTo) => {
                  this.scrollViewerTo = scrollTo;
                  this.scrollToHighlightFromHash();
                }}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  <Tip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      this.addHighlight({ content, position, comment });

                      hideTipAndSelection();
                    }}
                  />
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {
                  const isTextHighlight = !Boolean(
                    highlight.content && highlight.content.image
                  );

                  const component = isTextHighlight ? (
                    <Highlight
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                    />
                  ) : (
                    <AreaHighlight
                      isScrolledTo={isScrolledTo}
                      highlight={highlight}
                      onChange={(boundingRect) => {
                        this.updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) }
                        );
                      }}
                    />
                  );

                  return (
                    <Popup
                      popupContent={<HighlightPopup {...highlight} />}
                      onMouseOver={(popupContent) =>
                        setTip(highlight, (highlight) => popupContent)
                      }
                      onMouseOut={hideTip}
                      key={index}
                      children={component}
                    />
                  );
                }}
                highlights={highlights}
              />
            )}
          </PdfLoader>
        </div>
      </div>
    );
  }
}

export default App;