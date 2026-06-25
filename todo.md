# Clinic Management System - TODO

## Database & Backend
- [x] Extended database schema (patients, visits, prescriptions, appointments, files, diagnoses, activity logs, settings, prescription templates)
- [x] Role enum extended to admin/doctor/assistant
- [x] Auth router with role-based protectedProcedure
- [x] Patients router: CRUD, soft delete, archive, restore
- [x] Visits router: CRUD with vital signs, diagnosis, follow-up
- [x] Prescriptions router: CRUD, templates, favorites
- [x] Appointments router: CRUD, calendar view data
- [x] Files router: S3 upload, presigned URLs, categories, delete
- [x] Diagnoses/Tags router
- [x] Search router: global search across all entities
- [x] Reports router: daily/monthly stats, diagnosis stats, doctor stats
- [x] Activity log router: track all user actions
- [x] Settings router: clinic info, doctor info, logo
- [x] Seed data: demo patients, visits, prescriptions, appointments

## Frontend - Layout & Auth
- [x] Global CSS theme (medical blue, white, light gray, soft green)
- [x] Google Fonts (Inter) in index.html
- [x] ClinicLayout with sidebar navigation (collapsible)
- [x] Login page with role-based redirect
- [x] Protected route wrapper
- [x] User profile dropdown in sidebar

## Frontend - Dashboard
- [x] Total patients, today's appointments stats cards
- [x] Recent patients table
- [x] Recent visits list
- [x] Follow-up reminders widget
- [x] Monthly statistics with Recharts line/bar chart
- [x] Patient growth chart
- [x] Latest activity feed

## Frontend - Patient Management
- [x] Patients list page with search, filters, pagination
- [x] Add/Edit patient form (full fields)
- [x] Patient status badges (New/Follow-up/Stable/Critical)
- [x] Soft delete with confirmation dialog
- [x] Archive/Restore page
- [x] Patient profile page with tabs

## Frontend - Patient Profile
- [x] Personal information tab
- [x] Medical timeline (chronological events)
- [x] Visit history tab
- [x] Uploaded files tab
- [x] Prescriptions tab
- [x] Doctor notes tab
- [x] Export patient PDF button

## Frontend - Visits
- [x] Visits list page
- [x] Add/Edit visit form (diagnosis, symptoms, vitals, notes, follow-up)
- [x] Visit detail view
- [x] Diagnosis tags component
- [x] Vital signs input fields

## Frontend - Prescriptions
- [x] Prescription form (medicine, dose, frequency, duration, instructions)
- [x] Save as template / favorite
- [x] Reuse previous prescription
- [x] Print/Export PDF
- [x] Drug history per patient

## Frontend - Appointments
- [x] Appointments calendar view with filters
- [x] Calendar view (both list and calendar grid views implemented)
- [x] Add/Edit appointment form
- [x] Status management (Pending/Completed/Cancelled)

## Frontend - File Management
- [x] Drag-and-drop multi-file upload
- [x] File categories (Lab, X-ray, MRI, CT, Ultrasound, Report, Other)
- [x] File preview (images and PDFs)
- [x] Download with presigned URL
- [x] Delete file
- [x] Image annotation tool (pen, highlight, circle, arrow, text, undo, clear, download) (draw, highlight, circle, arrow, notes) — future enhancement

## Frontend - Search & Filters
- [x] Global search bar in header
- [x] Search results page
- [x] Advanced filters panel (doctor, date, status, disease, gender, age)

## Frontend - Reports
- [x] Daily patients report
- [x] Monthly visits report
- [x] Most common diagnoses chart
- [x] Patient statistics
- [x] Doctor statistics
- [x] Export to CSV

## Frontend - Activity Log
- [x] Activity log table with user, date, action
- [x] Filters by user, action type, date range

## Frontend - Settings
- [x] Clinic information form
- [x] Doctor information form
- [x] Logo upload
- [x] System preferences

## UX Polish
- [x] Loading skeletons
- [x] Empty states
- [x] Confirmation dialogs
- [x] Toast notifications
- [x] Pagination components
- [x] Responsive tables
- [x] Mobile responsive layout

## New Features (Round 2)

- [x] Dark Mode toggle in sidebar with localStorage persistence
- [x] Dark mode CSS variables for all semantic colors
- [x] Full patient PDF export via browser print (patient info + visits + prescriptions + files list + appointments)
- [x] AI reports backend router: diagnosis analysis, patient insights, trend summary using LLM
- [x] AI Reports page section with AI Analysis tab, data snapshot cards, and markdown-rendered report

## New Features (Round 3)

- [x] Fix dark mode toggle (moved CSS vars from @theme inline to :root/.dark blocks)
- [x] Custom patient tags: tag input in add/edit patient form (TagInput component)
- [x] Patient tags filter in patients list page
- [x] DB: add tags column to patients table (VARCHAR 500)
- [x] Add treatment name field to prescriptions (treatmentName column + form field)
- [x] Full Arabic UI translation (all pages, navigation, forms, messages) + RTL + Cairo font
