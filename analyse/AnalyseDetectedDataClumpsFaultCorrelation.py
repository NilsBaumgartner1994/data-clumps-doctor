import matplotlib.pyplot as plt
import pandas as pd
from scipy.stats import spearmanr
import numpy as np

data = {
    "tags": [
        {"commitHash": "48d5c652044686720d8e17421980d179e9113c0b", "tag": "v1.7.0", "timestamp": 1358614875, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 34, "parameterFieldDataClumps": 6, "bicsUntilCommit": 620},
        {"commitHash": "181f32baf44f4faf9f3c5fb117b616dd22992735", "tag": "v1.7.1", "timestamp": 1359653828, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 34, "parameterFieldDataClumps": 6, "bicsUntilCommit": 904},
        {"commitHash": "e8e78e9ae78cc65af681316e478437686b288628", "tag": "v1.8.0", "timestamp": 1360449946, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 24, "parameterFieldDataClumps": 6, "bicsUntilCommit": 1207},
        {"commitHash": "2cc3f90a1995dd7f1b39b892a8279f424532ff09", "tag": "v1.8.1", "timestamp": 1362773433, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 24, "parameterFieldDataClumps": 6, "bicsUntilCommit": 1232},
        {"commitHash": "5e1f7d04b4f1549c14a861b9ae0a40f474637146", "tag": "v1.8.2", "timestamp": 1363120566, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 24, "parameterFieldDataClumps": 8, "bicsUntilCommit": 1283},
        {"commitHash": "20172fa7ce474e70c54798b4ba3743be56945ddc", "tag": "v1.8.3", "timestamp": 1364679985, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 14, "parameterFieldDataClumps": 8, "bicsUntilCommit": 1394},
        {"commitHash": "62fa1bde1d562472eca7d4a2d2117d94e6e36d3c", "tag": "v1.8.4", "timestamp": 1365844572, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 14, "parameterFieldDataClumps": 8, "bicsUntilCommit": 1402},
        {"commitHash": "d619c5f915e566df1af75b7bed95b90b5926a4aa", "tag": "v1.8.5", "timestamp": 1372548524, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 14, "parameterFieldDataClumps": 7, "bicsUntilCommit": 1475},
        {"commitHash": "dbb052cc4395c0130707fdcd182ef532ed3e2060", "tag": "v1.8.6", "timestamp": 1374692408, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 14, "parameterFieldDataClumps": 5, "bicsUntilCommit": 1505},
        {"commitHash": "d056482f7a9bf840a1bab0fef0be27ba05aa702c", "tag": "v1.9.0", "timestamp": 1385587060, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 28, "parameterFieldDataClumps": 7, "bicsUntilCommit": 1597},
        {"commitHash": "6a5a8260a1650bdc7584257d8d28bc91845f8db5", "tag": "v1.9.1", "timestamp": 1388096659, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 72, "parameterFieldDataClumps": 14, "bicsUntilCommit": 1602},
        {"commitHash": "74c53a807310decb44797677d41e964e288970ed", "tag": "v1.9.2", "timestamp": 1400884865, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 74, "parameterFieldDataClumps": 16, "bicsUntilCommit": 1697},
        {"commitHash": "7dd735871fec70d4a93837a26503470804b7d7e4", "tag": "v1.9.3", "timestamp": 1410019853, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 74, "parameterFieldDataClumps": 16, "bicsUntilCommit": 1703},
        {"commitHash": "6178836980e47d9813165051b4b8527fff8e1b58", "tag": "v1.9.4", "timestamp": 1432847965, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 74, "parameterFieldDataClumps": 16, "bicsUntilCommit": 1704},
        {"commitHash": "9da1b1ad1dd61b8df1571d7b6dc1308f19d5d40d", "tag": "v1.9.5", "timestamp": 1448662149, "fieldFieldDataClumps": 0, "parameterParameterDataClumps": 92, "parameterFieldDataClumps": 17, "bicsUntilCommit": 1704},
    ],
}

rows = []
for project, records in data.items():
    for r in records:
        row = r.copy()
        row["project"] = project
        rows.append(row)

df = pd.DataFrame(rows)

print("\n--- Datenübersicht ---")
print(df.head())

print("\n--- Korrelationsanalyse ---")
for project in df['project'].unique():
    project_df = df[df['project'] == project].copy() # .copy() um SettingWithCopyWarning zu vermeiden
    if len(project_df) > 1:
        project_df['total_data_clumps'] = project_df['fieldFieldDataClumps'] + project_df['parameterParameterDataClumps'] + project_df['parameterFieldDataClumps']
        
        if project_df['bicsUntilCommit'].nunique() > 1 and project_df['total_data_clumps'].nunique() > 1:
            rho, pval = spearmanr(project_df['bicsUntilCommit'], project_df['total_data_clumps'])
            print(f"Project {project}: Spearmanr(bicsUntilCommit, total_data_clumps): rho={rho:.3f}, p={pval:.4f}")
        else:
            print(f"Project {project}: Not enough variation for correlation analysis.")
    else:
        print(f"Project {project}: Not enough data points for correlation analysis.")

if df['bicsUntilCommit'].nunique() > 1 and (df['fieldFieldDataClumps'] + df['parameterParameterDataClumps'] + df['parameterFieldDataClumps']).nunique() > 1:
    df['total_data_clumps'] = df['fieldFieldDataClumps'] + df['parameterParameterDataClumps'] + df['parameterFieldDataClumps']
    rho_global, pval_global = spearmanr(df['bicsUntilCommit'], df['total_data_clumps'])
    print(f"Global Spearmanr(bicsUntilCommit, total_data_clumps): rho={rho_global:.3f}, p={pval_global:.4f}")
else:
    print(f"Global correlation: Not enough variation in data for analysis.")

# Beispiel: Plotting der Metriken über die Zeit
for project, records in data.items():
    df_project = pd.DataFrame(records).sort_values(by='timestamp')
    df_project['date'] = pd.to_datetime(df_project['timestamp'], unit='s')
    
    plt.figure(figsize=(12, 6))
    plt.plot(df_project['date'], df_project['bicsUntilCommit'], label='BICs Until Commit', marker='o')
    plt.plot(df_project['date'], df_project['fieldFieldDataClumps'], label='Field-Field Data Clumps', marker='x')
    plt.plot(df_project['date'], df_project['parameterParameterDataClumps'], label='Parameter-Parameter Data Clumps', marker='s')
    plt.plot(df_project['date'], df_project['parameterFieldDataClumps'], label='Parameter-Field Data Clumps', marker='d')
    
    plt.xlabel('Date')
    plt.ylabel('Count')
    plt.title(f'Metrics Over Time for {project}')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(f'{project}_metrics_over_time.png')
    plt.close()

print("\n--- Plots gespeichert ---")
