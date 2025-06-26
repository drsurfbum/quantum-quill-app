# QQ - AI-Enhanced Creative Writing Platform

A comprehensive web platform for AI-enhanced creative writing, featuring advanced storytelling tools with intelligent content management and collaborative story development.

## Features

### 📖 Story Bible System
- **Comprehensive Entry Types**: Characters, Groups/Races, Locations, Events, World Elements, Details, and Research
- **Advanced Categorization**: 23+ categories with intelligent subcategory management
- **Smart Organization**: Bento-style dashboard with collapsible cards and progressive disclosure
- **Rich Image Support**: File upload with drag-and-drop interface and URL input
- **Relationship Mapping**: Link entries across different types for complex world-building
- **Stable Autosave**: Robust state management preventing editor closures

### 🎯 Project Management
- **Multi-Project Support**: Organize multiple writing projects
- **Chapter Management**: Structured chapter organization with rich text editing
- **Outline Tools**: Hierarchical story structure planning
- **Plot Structure**: Template-based plot development tools
- **Whiteboard**: Visual planning and brainstorming canvas

### 🔧 Technical Features
- **Real-time Collaboration**: Multi-user editing capabilities
- **Rich Text Editor**: TipTap-based editor with advanced formatting
- **File Upload System**: Secure image upload with 5MB limit and validation
- **Export Functionality**: Export projects in multiple formats
- **Responsive Design**: Mobile-friendly interface with adaptive layouts

## Technology Stack

- **Frontend**: React 18 + TypeScript, Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack React Query
- **Authentication**: Passport.js with multiple strategies
- **File Storage**: Multer for file uploads
- **Rich Text**: TipTap editor with extensions

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/achartt/QQ-replit.git
   cd QQ-replit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy and configure your environment variables
   cp .env.example .env
   ```

4. **Set up database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Backend Express application
│   ├── auth.ts            # Authentication setup
│   ├── routes.ts          # API routes
│   ├── db.ts              # Database connection
│   └── storage.ts         # Data layer
├── shared/                 # Shared types and schemas
│   ├── schema.ts          # Database schema
│   └── enhanced-taxonomy.ts # Category definitions
└── uploads/               # File upload directory
```

## Key Components

### Story Bible System
The heart of the application, providing comprehensive world-building tools:

- **Character Editor**: Detailed character profiles with demographics, relationships, and development arcs
- **Groups/Races Editor**: Organizations, species, and factions with political structures
- **Locations Editor**: Places with history, governance, and geographical details
- **Events Editor**: Timeline management with cause-and-effect tracking
- **World Elements Editor**: Magic systems, technologies, and unique world features
- **Details Editor**: Granular story elements and continuity tracking
- **Research Editor**: Reference materials and fact-checking

### Enhanced Features
- **Stable State Management**: Prevents editors from closing unexpectedly during saves
- **Progressive Disclosure**: Collapsible sections for managing complex forms
- **Smart Categorization**: Context-aware field groupings based on entry types
- **Relationship Linking**: Cross-reference entries for complex storytelling
- **Image Integration**: Visual elements with descriptions and metadata

## Recent Updates

- ✅ Implemented comprehensive story bible system with 7 specialized editors
- ✅ Added stable state management preventing editor closures
- ✅ Integrated file upload system with drag-and-drop interface
- ✅ Enhanced categorization with 23+ categories and subcategories
- ✅ Improved cache management for optimal performance
- ✅ Added progressive disclosure for complex forms

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email [your-email] or open an issue on GitHub.