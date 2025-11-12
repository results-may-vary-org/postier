# README

## About

This is the official Wails React-TS template.

You can configure the project by editing `wails.json`. More information about the project settings can be found
here: https://wails.io/docs/reference/project-config

## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.




- lorsque luser selectionne une collection ou ouvre une collection ou intéragis avec un des enfants elle est automatiquement marqué comme selectioné et enregistré dans un localstorage
- cette collection voit sont titre marqué en orange
- si lutilisateur click sur un fichier alors on charge la requete et la reponse contenue dans ce fichier dans linterface
- si lutilisateur appuie sur ctrl+s alors on enregistre la requete et la reponse avec la date et lheure de l'enregistrement dans un fichier qui est créer dans cette collection par défaut (on demande le nom du fichier a luser) sauf si la requete a était chargé depuis un fichier existant auquel cas on enregistre dans ce ficher
- si une requete n'est pas sauvegarder ou sauvegarder on annote ce status via deux icon rouge ou verte CheckCircledIcon, CrossCircledIcon juste en haut du composant HttpClient
- si aucune collection par defaut est present dans le localstorage et quil existe une collection alors c'est la collection par défaut
- si aucune collection par defaut est present dans le localstorage et quil existe plusieurs collections ou que rien nest présent nulle part alors on demande a lutilisateur de selectionner une collection
- il faut ajouter un bouton pour rafraichir les tree (UpdateIcon)
