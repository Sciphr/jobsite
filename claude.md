Never do any npm commands or npx commands; for example, don't run a dev server or do an npx prisma command; tell me to do those

Ensure to look at the prisma schema when referring to anything database related to ensure you get the snake case vs camel case correct

All added code, ensure dark mode styling is applied, and mobile responsiveness

Make sure to double check the imports since you seem to not go back enough steps to the proper folder

Unless i specify to add a setting to the settings table, assume the setting is already in there

All API calls that would change something in the UI, should show the change immediately; I shouldn't have to refresh the page to see the updated version of whatever action I took. This application uses React Query. Use that or NextJS capabilities to ensure great responsiveness.
