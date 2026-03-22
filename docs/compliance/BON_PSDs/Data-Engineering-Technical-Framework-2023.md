# Bank of Namibia Data Engineering Technical Framework  2023

1 
 
Office Use Only \General  Bank of Namib ia Data Engineering  
Technical Framework  
 
Purpose  
The purpose of this framework is to outline the current  layout and the   
technological landscapes of the Data Analytics infrastructure  at the Bank of 
Namibia, segmented into two co mponents , Cloud -based , and On-Premises  
based.  
Target Audience  
This framework is intended for Bank of Namibia IT personnel as  well as any 
stakeholders who require its use for ease of reference  in line with the  Digital 
Transformation programme of the Bank . 
Context  
The Bank of Namibia uses various technology  tools an chored on this framework  
to manage, transform, and deliver data efficiently and reliably  for various use 
cases in the Bank.  
Data Storage and Processing  
The Bank of Namibia s tores and process es large volumes of data from various 
sources and formats.  Most of this data is housed in various systems .  
Types  of data storage and processing systems  used :  
• Relational databases, data warehouses, data lakes.  
o Microsoft SQL Server/Azure  SQL Database  for structured data .  
o Microsoft SQL Server Integration Services  and Azure Synapse  
Analytics  for data warehousing . 
o Azure  Data Lake for data lake  storage .

2 
 
Office Use Only \General  Data Integration and ETL /ELT 
We integrate and transform data from various sources and formats into a  
consistent and usable form for analysis and consumption.  
ETL (extract -transform -load) or ELT ( extract -load -transform) tools and 
frameworks that automate and streamline the data integration process  is used .  
Toolset s: 
• Microsoft  SQL Server /Azure  SQL Database  
• Data Pipelines (SQL Server Integration Services /Azure Data Factory ) 
o Connecting and loading data from different sources  
o Orchestrating and scheduling data pipelines  
• Data Warehouse (SQL Server Integration Services / Azure Synapse  
Analytics ) 
o Transforming and manipulating data  
• Tabular/Dimensional Cubes (SQL Server Analysis Services /Azure Synapse  
Analytics ) 
Data Quality and Testing  
To ensure the quality and reliability of the data and pipelines : 
• Check  and validat e the data for accuracy, completeness, consistency, 
timeliness, and compliance.  
• Test and monitor the pipelines for performance, availability, and error 
handling.  
• Define and verify data quality expectations . 
• Collect and visualiz e pipeline metrics and alerts . 
• Manag e and troubleshoot pipeline failures.  
Data Modelling  and Design  
Model and design data structures and schemas that support our data analysis 
and business goals. The model must answer business -level questions 
independently of the implementation :

3 
 
Office Use Only \General  • Choos e the appropriate data modelling  techniques and patterns . 
o Dimensional modelling , star schema, snowflake schema, or data 
vault, according to  data characteristics, requirements, and use 
cases.  
• Apply  best practices and principles of data modelling , 
o Normalization, denormalization, referential integrity, or data 
gover nance.  
• Create and document the data models . 
• Define and generat e the  data schemas.  
• Manag e and cataloguing  the data assets.  
Data Analysis and Visualization  (Microsoft Power BI)  
To enable and facilitate  data analysis and visualization for our data consumers 
and stakeholders.  
• Provid e the necessary data access and security controls . 
• Authentication, authorization, encryption, or auditing.  
• Select and integrat e suitable data analysis and visualization tools a nd 
frameworks .  
• Interactive data exploration and prototyping .  
• Collaborative data analysis and sharing . 
• Microsoft Power BI for creating and delivering data dashboards and 
reports.  
o Power BI assets :  
▪ Dashboards , Reports  and KPI’s  
▪ Datasets