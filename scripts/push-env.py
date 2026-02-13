import os
import subprocess

def add_env_vars():
    env_file = ".env"
    if not os.path.exists(env_file):
        print(f"{env_file} not found")
        return

    with open(env_file, "r") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        
        if "=" in line:
            key, value = line.split("=", 1)
            # Remove quotes if present
            value = value.strip('"').strip("'")
            print(f"Adding {key}...")
            # Run vercel env add
            # We add to all environments by default if possible, or just production/preview/development
            for env in ["production", "preview", "development"]:
                subprocess.run(["npx", "vercel", "env", "add", key, value, env, "--yes"], capture_output=True)

if __name__ == "__main__":
    add_env_vars()
