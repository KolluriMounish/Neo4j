import React, { useState, useEffect } from 'react';
import { Cytoscape, useCytoscape } from 'cytoscape';
import 'cytoscape/dist/cytoscape.css'; // Import Cytoscape styles
import { createPopper } from '@popperjs/core'; // Using Popper.js for tooltips

const App = () => {
  const [cy, setCy] = useState(null);
  const [elements, setElements] = useState([]);

  // Customize this function to fetch data from Neo4j using the Neo4j driver
  const fetchNeo4jData = async () => {
    try {
      // Replace with your Neo4j driver code to fetch combined elements
      const neo4jDriver = require('neo4j-driver'); // Assuming you're using neo4j-driver
      const driver = neo4jDriver.driver('bolt://localhost:7677', neo4jDriver.auth.basic('neo4j', 'password'));
      const session = driver.session();

      const results = await session.run('MATCH (n) RETURN n'); // Adjust Cypher query as needed
      const elementData = results.records.map((record) => record.get('n')); // Assuming elements include both nodes and edges

      setElements(elementData);

      await session.close();
      await driver.close();
    } catch (error) {
      console.error('Error fetching data from Neo4j:', error);
    }
  };

  useEffect(() => {
    fetchNeo4jData();
  }, []);

  useEffect(() => {
    if (elements.length > 0) {
      const cyInstance = Cytoscape({
        container: document.getElementById('cy'),
        elements: elements.map((element) => {
          return {
            data: element.properties, // Assuming properties holds element data
            group: element.labels ? element.labels[0] : 'nodes', // Group by labels (if available)
          };
        }),
        layout: { name: 'cola' }, // Adjust layout as desired
        style: [
          // Define your Cytoscape styles here (colors, shapes, etc.)
          {
            selector: 'node',
            style: {
              backgroundColor: '#66ccff',
              shape: 'ellipse',
              label: 'data.name', // Or any other property for node labels
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              lineColor: '#ccc',
              targetArrowShape: 'triangle', // Adjust edge styles
            },
          },
          // ... additional styles for nodes and edges
        ],
      });

      setCy(cyInstance);
    }
  }, [elements]);

  const handleElementHover = (event) => {
    const element = event.target;
    const popperInstance = createPopper(element.popperRef(), document.body, {
      placement: 'top', // Adjust placement as needed
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, 8], // Adjust offset as needed
          },
        },
      ],
    });

    // Create and position the tooltip content
    const tooltipElement = document.createElement('div');
    tooltipElement.classList.add('tooltip'); // Add CSS class for styling
    tooltipElement.textContent = JSON.stringify(element.data(), null, 2); // Customize tooltip content
    document.body.appendChild(tooltipElement);

    popperInstance.setOptions({
      modifiers: popperInstance.options.modifiers.concat({
        // ... add popper modifiers for positioning and behavior
      }),
    });

    // Cleanup on mouseout
    element.on('mouseout', () => {
      document.body.removeChild(tooltipElement);
      popperInstance.destroy();
    });
  };

  return (
    <div>
      <div id="cy" style={{ width: '800px', height: '600px' }} />
    </div>
  );
};

export default App;
