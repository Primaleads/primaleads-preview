
import React from "react";
import ReactDOM from "react-dom/client";

const App = () => {
    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Welcome to Primaleads Preview</h1>
            <p>This is your staging environment.</p>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
