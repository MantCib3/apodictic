import subprocess
import sys

def run_script(script_name):
    try:
        # Run the script and wait for it to complete
        result = subprocess.run([sys.executable, script_name], check=True, text=True, 
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Successfully executed {script_name}")
        print(result.stdout)
        if result.stderr:
            print(f"Warnings/Errors from {script_name}:\n{result.stderr}")
    except subprocess.CalledProcessError as e:
        print(f"Error executing {script_name}: {e}")
        print(f"Error output: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Script {script_name} not found")
        sys.exit(1)

def main():
    # List of scripts in execution order
    scripts = ['./Production/newsarticle.py', './Production/AI-.py', './Production/AI-clnr.py', './Production/PUSHDB.py']
    
    print("Starting pipeline execution...")
    
    # Execute each script in sequence
    for script in scripts:
        print(f"\nRunning {script}...")
        run_script(script)
    
    print("\nPipeline execution completed successfully!")

if __name__ == "__main__":
    main()