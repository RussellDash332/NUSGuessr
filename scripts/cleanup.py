
import os

# The directories to exclude from the cleanup
EXCLUDE_DIRS = {"node_modules", ".next", "scripts"}
# The file extensions to include in the cleanup
INCLUDE_EXTS = {
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".json",
    ".css",
    ".md",
    ".yaml",
    ".yml",
    ".py",
}


def cleanup_file(filepath):
    """
    Cleans up a single file by removing leading/trailing whitespace and ensuring
    a single newline at the end.
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        if not lines:
            return  # Skip empty files

        # Find the first and last non-empty lines
        first_line_idx = -1
        for i, line in enumerate(lines):
            if line.strip():
                first_line_idx = i
                break

        last_line_idx = -1
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip():
                last_line_idx = i
                break
        
        if first_line_idx == -1: # file is all whitespace
            content = "\n"
        else:
            # Get the relevant content, strip trailing spaces from each line
            cleaned_lines = [
                line.rstrip() for line in lines[first_line_idx : last_line_idx + 1]
            ]
            content = "\n".join(cleaned_lines) + "\n"


        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"Cleaned: {filepath}")

    except Exception as e:
        print(f"Error processing file {filepath}: {e}")


def main():
    """
    Walks through the project directory and cleans up specified files.
    """
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Starting cleanup in: {project_dir}")

    for root, dirs, files in os.walk(project_dir):
        # Modify dirs in-place to exclude specified directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            if any(file.endswith(ext) for ext in INCLUDE_EXTS):
                cleanup_file(os.path.join(root, file))

    print("Cleanup complete.")


if __name__ == "__main__":
    main()
