import React, { useEffect, useState, useRef } from 'react';
import Cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import COSEBilkent from 'cytoscape-cose-bilkent';
import cydagre from 'cytoscape-dagre';
import cola from 'cytoscape-cola';
import fcose from 'cytoscape-fcose';
import neo4j from 'neo4j-driver';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import popper from 'cytoscape-popper';

Cytoscape.use(COSEBilkent);
Cytoscape.use(cydagre);
Cytoscape.use(cola);
Cytoscape.use(fcose);
Cytoscape.use(popper);

const layout = {
  name: 'fcose',
  animate: true,
  randomize: false, // Start with the given positions
  nodeRepulsion: 4500,
  idealEdgeLength: 100,
  edgeElasticity: 0.45,
  nestingFactor: 0.1,
  gravity: 0.25,
  numIter: 2500,
  tile: true,
  packComponents: true,
  nodeDimensionsIncludeLabels: true,
};

const stylesheet = [
  {
    selector: 'node',
    style: {
      'background-color': '#1F2780',
      'color': '#044471', // Set font color to white
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': '80px',
      'text-valign': 'center',
      'text-halign': 'center',
    },
  },
  {
    selector: 'edge',
    style: {
      'line-color': '#42AB2B',
      width: 1,
      label: 'data(label)',
      'color': '#335b1d', // Set font color to white
      'curve-style': 'unbundled-bezier',
      'control-point-step-size': 25,
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#42AB2B',
    },
  },
  {
    selector: ':parent',
    style: {
      'background-color': '#d9d9d9',
    },
  },
  {
    selector: ':selected',
    style: {
      'background-color': '#ff9900',
    },
  },
];

const Neo4jGraph = () => {
  const [elements, setElements] = useState([]);
  const cyRef = useRef(null);
  const tippyInstancesRef = useRef({});

  useEffect(() => {
    const driver = neo4j.driver("neo4j+s://49520997.databases.neo4j.io:7687", neo4j.auth.basic("neo4j", "tcs12345"));
    const session = driver.session();
    const fetchData = async () => {
      
      const cypherQuery = `
        MATCH (n:!PLMXML)-[r:HAS]-(m)
        WITH COLLECT(DISTINCT {
          id: elementID(n), 
          label: labels(n)[0], 
          properties: properties(n)
        }) AS nodes,
        COLLECT(DISTINCT {
          id: elementID(r), 
          source: elementID(startNode(r)), 
          target: elementID(endNode(r)), 
          label: type(r),
          properties: properties(r)
        }) AS edges
        WHERE ALL(node IN nodes WHERE node.properties IS NOT NULL) AND
        ALL(edge IN edges WHERE edge.properties IS NOT NULL)
        RETURN {nodes: nodes, edges: edges} LIMIT 500;
      `;

      try {
        const result = await session.run(cypherQuery);
        const nodeElements = result.records[0]._fields[0].nodes;
        const edgeElements = result.records[0]._fields[0].edges;
        const newElements = [
          ...nodeElements.map(node => ({
            data: {
              id: node.id,
              label: node.properties.subType,
              tooltip: JSON.stringify(node.properties, null, 2),
            },
            position: {
              x: Math.random() * 1000,
              y: Math.random() * 1000
            }
          })),
          ...edgeElements.map(edge => ({
            data: {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              label: edge.properties.name,
              tooltip: JSON.stringify(edge.properties, null, 2),
            }
          })),
        ];
        setElements(newElements);

        // Delay tooltip creation until elements are rendered
        setTimeout(() => createTooltips(newElements), 1000);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        await session.close();
        await driver.close();
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const handleMouseOver = (event) => {
      const target = event.target;
      const tippyInstance = tippyInstancesRef.current[target.id()];
      if (tippyInstance) {
        tippyInstance.show();
      }
    };

    const handleMouseOut = (event) => {
      const target = event.target;
      const tippyInstance = tippyInstancesRef.current[target.id()];
      if (tippyInstance) {
        tippyInstance.hide();
      }
    };

    cy.on('mouseover', 'node, edge', handleMouseOver);
    cy.on('mouseout', 'node, edge', handleMouseOut);

    return () => {
      cy.off('mouseover', 'node, edge', handleMouseOver);
      cy.off('mouseout', 'node, edge', handleMouseOut);

      // Cleanup tippy instances on component unmount
      Object.values(tippyInstancesRef.current).forEach(instance => {
        instance.destroy();
      });
      tippyInstancesRef.current = {};
    };
  }, [elements]);

  const createTooltips = (newElements) => {
    const cy = cyRef.current;
    if (!cy) return;

    newElements.forEach(element => {
      const { id, tooltip } = element.data;
      if (!tippyInstancesRef.current[id]) {
        const ref = cy.getElementById(id).popperRef();
        const dummyDomEle = document.createElement('div');

        const tippyInstance = tippy(dummyDomEle, {
          content: tooltip,
          trigger: 'manual',
          interactive: true,
          appendTo: document.body,
          allowHTML: true,
          placement: 'bottom',
          onHide(instance) {
            instance.destroy();
            delete tippyInstancesRef.current[id];
          },
        });

        tippyInstancesRef.current[id] = tippyInstance;

        ref && tippyInstance.popperInstance && tippyInstance.popperInstance.update();
      }
    });
  };

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#D1D1E1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CytoscapeComponent
        elements={elements}
        layout={layout}
        stylesheet={stylesheet}
        style={{ width: '100%', height: '100%' }}
        cy={(cy) => { cyRef.current = cy; }}
      />
    </div>
  );
};

export default Neo4jGraph;
