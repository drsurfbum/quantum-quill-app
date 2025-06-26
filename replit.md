# QQ - Creative Writing Platform

## Project Overview

A comprehensive web platform for AI-enhanced creative writing, featuring advanced storytelling tools with intelligent content management and collaborative story development. The platform focuses on providing robust world-building capabilities through a sophisticated story bible system.

## Current State

### Story Bible System (✅ Complete)
- **7 Specialized Editors**: Characters, Groups/Races, Locations, Events, World Elements, Details, Research
- **Enhanced Categorization**: 23+ categories with intelligent subcategory management
- **Stable State Management**: Resolved editor closing issues with state machine pattern
- **File Upload Integration**: Drag-and-drop interface with 5MB limits and validation
- **Progressive Disclosure**: Collapsible sections for managing complex forms
- **Relationship Mapping**: Cross-reference entries across different types

### Technical Implementation
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express, PostgreSQL + Drizzle ORM
- **State Management**: TanStack React Query with optimized cache strategies
- **Authentication**: Passport.js with session management
- **File Handling**: Multer with secure upload validation

## Recent Changes (June 2025)

### Major Fixes Implemented
- **Editor Stability**: Implemented state machine pattern to prevent editor closures
- **Cache Optimization**: Separated individual vs list cache updates (500ms delay for lists)
- **Component Stabilization**: Added stable EditorRenderer with useCallback
- **Mount Key Strategy**: Unique keys prevent unwanted component re-mounting
- **Deferred Updates**: setTimeout strategy for cache updates to prevent re-render conflicts

### Field Name Corrections (June 26, 2025)
- **Taxonomy Spelling Fix**: Corrected `eraDisolved` to `eraDissolved` in both taxonomy files
- **Component Consistency**: Updated Groups/Races and Locations editors to use consistent field names
- **Data Model Alignment**: Ensured UI components align with taxonomy field definitions

### API Bug Fix (June 26, 2025)
- **Delete Project Route**: Fixed bug where route ignored storage.deleteProject() return value
- **Error Handling**: Now properly returns 500 error when deletion fails instead of always returning 204

### Automated Testing Infrastructure (June 26, 2025)
- **Authentication Test Suite**: Replaced manual token-auth-test.js with comprehensive Jest test suite
- **Test Coverage**: Added 3 specialized test files covering authentication, integration flows, and security
- **Security Testing**: Implemented password hashing validation and timing attack protection tests
- **Token Validation**: Created comprehensive token format and security validation tests
- **Infrastructure Setup**: Added Jest configuration with ES module support and TypeScript integration

### TypeScript Error Resolution (June 26, 2025)
- **Taxonomy System**: Fixed type safety issues in taxonomy property access with proper type guards
- **Authentication Types**: Corrected AuthUser interface compliance in development mode authentication
- **File Upload Components**: Added missing FileUpload import and corrected parameter types
- **Test Framework**: Resolved cookie header type casting issues in authentication tests
- **Error Handling**: Improved error type casting in route handlers for better type safety

### File Upload System
- **Comprehensive Integration**: Added to all 7 editor types
- **Dual Input Methods**: URL input and device file upload
- **Validation**: 5MB size limits, image type validation, error handling
- **UI/UX**: Drag-and-drop interface with loading states and success feedback

## Architecture Decisions

### State Management Strategy
- **Unified State Machine**: Single `editorState` object manages all editor interactions
- **Stable References**: useRef and useCallback prevent unnecessary re-renders
- **Cache Isolation**: Separated immediate and deferred cache updates

### Data Layer
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Enhanced Taxonomy**: Centralized category system with 23+ predefined categories
- **Relationship Modeling**: Flexible foreign key relationships between entry types

### Performance Optimizations
- **Query Optimization**: 60-second staleTime, disabled refetchOnWindowFocus
- **Batch Operations**: Grouped state updates to minimize re-renders
- **Progressive Loading**: Conditional rendering based on data availability

## User Preferences

### Communication Style
- Technical precision when discussing implementation details
- Clear explanations for complex architectural decisions
- Concise progress updates without excessive pleasantries

### Development Approach
- No complete rewrites - iterative improvements preserving existing functionality
- Deep analysis of root causes before implementing solutions
- Comprehensive testing of edge cases and error scenarios

## Known Issues & Solutions

### Resolved Issues
- ✅ **Editor Closing on Image Upload**: Fixed with state machine pattern
- ✅ **Cache Invalidation Conflicts**: Resolved with deferred cache updates
- ✅ **Component Re-mounting**: Fixed with stable mount keys
- ✅ **State Reset on Re-renders**: Resolved with unified state management
- ✅ **TypeScript Type Safety**: Resolved all compilation errors across taxonomy, authentication, and component systems
- ✅ **Authentication Test Framework**: Comprehensive Jest-based testing replacing manual validation scripts

### Future Enhancements
- AI writing assistance integration
- Real-time collaboration features
- Advanced export formats
- Mobile application development

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- Functional components with hooks
- Consistent naming conventions (camelCase for variables, PascalCase for components)
- Comprehensive error handling and loading states

### Database Operations
- Always use Drizzle ORM for type safety
- Prefer migrations over manual schema changes
- Implement proper foreign key relationships
- Use transactions for complex operations

### Component Architecture
- Prefer composition over inheritance
- Use custom hooks for shared logic
- Implement proper loading and error states
- Follow React Query patterns for data fetching

## Deployment Notes

### Environment Setup
- PostgreSQL database required
- Session secret for authentication
- File upload directory permissions
- Environment variables for configuration

### Production Considerations
- Database connection pooling
- File storage optimization
- CDN integration for static assets
- Monitoring and logging setup

---

*Last Updated: June 26, 2025*
*Project Status: Active Development - Story Bible System Complete*