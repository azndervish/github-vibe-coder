# GitHub OpenAI Assistant

This project was built to simplify editing code in GitHub on a mobile device. It serves as a human-in-the-loop AI agent, allowing users to interactively edit code with the assistance of OpenAI's language models while directly managing GitHub repositories.

## Features

- **GitHub Integration**: 
  - View the list of files in a repository.
  - Fetch and view file contents.
  - Commit and push new changes to files.
  - Delete files from the repository.
  - Revert to previous commits.

- **OpenAI Interaction**:
  - Send and receive messages using OpenAI's language models.
  - Automate and assist with code editing based on AI-driven suggestions and responses.
  
- **User Settings**: 
  - Stores GitHub and OpenAI API keys, and branch information locally for persistence across sessions.

## Installation

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**:
   Ensure you have Node.js installed, then run:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file with your configurations:
   ```
   NEXT_PUBLIC_BRANCH=main
   NEXT_PUBLIC_COMMIT_HASH=your_commit_hash
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Usage

- Enter the necessary GitHub repository information and API keys in the settings section.
- Use the message input to communicate with OpenAI and interactively edit and manage the GitHub repository.
- View real-time updates and responses in the application interface.

## GitHub Token Permissions

To use this application, ensure your GitHub token has the following permissions:

- **Repository Permissions**:
  - Read access to metadata.
  - Read and Write access to actions, code, codespaces secrets, deployments, discussions, issues, pages, pull requests, repository hooks, and workflows.

## Tips for Using the GitHub OpenAI Assistant

- **Understand Your Role and the Agent's Role**: The agent, Codey, is here to assist you with making changes to your GitHub repository. It is designed to follow a structured process to ensure changes are accurately and effectively implemented.

- **Communicate Clearly**: When instructing the agent, be clear and concise about the change you wish to make. If you're unsure about a specific action, Codey will prompt you for more information, so be prepared to provide clarification.

- **Iterative Process**: Use Codey's iterative approach to refine your requests. Start with a simple change and collaborate with the agent to refine it until the outcome meets your expectations.

- **One Change at a Time**: Codey can read multiple files and reason over changes across them. However, it's best to complete all changes for one file before moving on to the next file. This approach helps maintain focus and clarity in the modification process.

## Contributing

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/my-new-feature`.
3. Commit your changes: `git commit -am 'Add my new feature'.
4. Push to the branch: `git push origin feature/my-new-feature`.
5. Submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
