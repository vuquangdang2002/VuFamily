const fs = require('fs');
let c = fs.readFileSync('client/src/styles/index.css', 'utf8');
c = c.replace(/@tailwind base;[\s\S]*?@tailwind utilities;/, `@import "tailwindcss";

@import "../shared/components/Sidebar.css";
@import "../shared/components/Header.css";
@import "../shared/components/Buttons.css";
@import "../shared/components/Search.css";
@import "../shared/components/Modal.css";
@import "../shared/components/Toast.css";
@import "../shared/components/Scrollbar.css";
@import "../shared/components/Common.css";
@import "../shared/components/Responsive.css";
@import "../shared/components/Animations.css";`);
fs.writeFileSync('client/src/styles/index.css', c);
