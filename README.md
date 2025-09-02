# Universal Leads CRM

A lightweight, no-backend CRM for universal lead generation and client management. Built with vanilla JavaScript and HTML/CSS.

## Features
- **Dashboard:** key metrics and a quick add form to capture leads on the fly.
- **Leads Management:** searchable and filterable table, edit/delete actions, JSON import/export.
- **Pipeline Board:** drag-and-drop columns reflecting your sales stages (New, Contacted, Qualified, Proposal, Won, Lost).
- **Clients, Tasks, Campaigns:** organize your customers, to‑dos, and marketing efforts in dedicated sections.
- **Settings:** customize pipeline stages and scoring rules to prioritize your leads.
- **Public Form:** `lead-form.html` provides a simple intake form you can share with prospects. Submissions are stored locally.
- **Local Storage:** all data persists in your browser’s localStorage—no backend or database required.

## Getting Started
1. Clone or download this repository.
2. Open `index.html` in your browser to run the CRM locally.
3. Use the navigation bar to explore Leads, Pipeline, Clients, Tasks, Campaigns, and Settings.
4. To deploy, upload the files to any static hosting service (GitHub Pages, Netlify, Vercel, etc.).
5. Share `lead-form.html` with prospects to collect leads directly into your CRM.

## Data Import/Export
- Export your leads as JSON using the **Export** button on the Leads page.
- Import leads by selecting a `.json` file via the **Import** button (the file should be an array of lead objects).

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
